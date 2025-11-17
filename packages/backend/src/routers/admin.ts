import { t, protectedProcedure, Context } from "@backend/trpc";
import { z } from "zod";
import { addRating } from "@backend/types/schemaHelpers";
import { bulkKeys, DEPARTMENT_LIST } from "@backend/utils/const";
import { PendingRating, Rating, Professor, TruncatedProfessor } from "@backend/types/schema";

const changeDepartmentParser = z.object({
    professorId: z.uuid(),
    department: z.enum(DEPARTMENT_LIST),
});

const changeNameParser = z.object({
    professorId: z.uuid(),
    firstName: z.string().trim(),
    lastName: z.string().trim(),
});

const fixEscapedCharsParser = z.object({
    professors: z
        .array(z.uuid())
        .min(1)
        .max(250, "Separate your request into batches of 250 professors."),
});

// Helper function for batch processing audits with cursor-based pagination
async function processAuditBatch<T extends Record<string, number>>(
    ctx: Context,
    input: { cursor?: string } | undefined,
    batchSize: number,
    processor: (
        professors: Professor[],
        ctx: Context,
    ) => Promise<{
        reportTasks: Promise<void>[];
        processedCount: number;
        metrics: T;
        messagePart: string;
    }>,
) {
    const profs = await ctx.env.kvDao.getAllProfessors();

    // Find starting index based on cursor
    let startIndex = 0;
    if (input?.cursor) {
        const cursorIndex = profs.findIndex((p: TruncatedProfessor) => p.id === input.cursor);
        startIndex = cursorIndex >= 0 ? cursorIndex : 0;
    }

    // Process batch of professors
    const endIndex = Math.min(startIndex + batchSize, profs.length);
    const batchProfessors = profs.slice(startIndex, endIndex);
    const professorIds = batchProfessors.map((p: TruncatedProfessor) => p.id);

    const professors = await ctx.env.kvDao.getBulkValues("professors", professorIds);

    const { reportTasks, processedCount, metrics, messagePart } = await processor(professors, ctx);

    // Execute all report writes for this batch
    await Promise.all(reportTasks);

    // Determine if there are more professors to process
    const hasMore = endIndex < profs.length;
    const nextCursor = hasMore ? profs[endIndex].id : null;

    return {
        processedCount,
        ...metrics,
        totalProfessors: profs.length,
        hasMore,
        nextCursor,
        message: `Processed ${processedCount} professors, ${messagePart}${hasMore ? "." : ". Audit complete."}`,
    };
}

export const adminRouter = t.router({
    removeRating: protectedProcedure
        .input(z.object({ professorId: z.string(), ratingId: z.string() }))
        .mutation(async ({ ctx, input: { professorId, ratingId } }) => {
            await ctx.env.kvDao.removeRating(professorId, ratingId);
        }),
    getPendingProfessors: protectedProcedure.query(({ ctx }) =>
        ctx.env.kvDao.getAllPendingProfessors(),
    ),
    approvePendingProfessor: protectedProcedure.input(z.uuid()).mutation(async ({ ctx, input }) => {
        const pendingProfessor = await ctx.env.kvDao.getPendingProfessor(input);

        await ctx.env.kvDao.putProfessor(pendingProfessor);
        await ctx.env.kvDao.removePendingProfessor(input);
    }),
    rejectPendingProfessor: protectedProcedure.input(z.uuid()).mutation(async ({ input, ctx }) => {
        await ctx.env.kvDao.removePendingProfessor(input);
    }),
    removeProfessor: protectedProcedure.input(z.uuid()).mutation(async ({ input, ctx }) => {
        await ctx.env.kvDao.removeProfessor(input);
    }),

    // Takes reviews of target professor and applies them to dest and then removes the target professor
    mergeProfessor: protectedProcedure
        .input(z.object({ destId: z.uuid(), sourceId: z.uuid() }))
        .mutation(async ({ ctx, input: { destId, sourceId } }) => {
            const destProfessor = await ctx.env.kvDao.getProfessor(destId);
            const sourceProfessor = await ctx.env.kvDao.getProfessor(sourceId);

            Object.entries(sourceProfessor.reviews).forEach(([course, ratings]) => {
                ratings.forEach((rating) => addRating(destProfessor, rating, course));
            });

            await ctx.env.kvDao.putProfessor(destProfessor);
            await ctx.env.kvDao.removeProfessor(sourceProfessor.id);
        }),
    changeProfessorDepartment: protectedProcedure
        .input(changeDepartmentParser)
        .mutation(async ({ ctx, input: { professorId, department } }) => {
            const professor = await ctx.env.kvDao.getProfessor(professorId);
            professor.department = department;
            await ctx.env.kvDao.putProfessor(professor);
        }),
    changePendingProfessorDepartment: protectedProcedure
        .input(changeDepartmentParser)
        .mutation(async ({ ctx, input: { professorId, department } }) => {
            const professor = await ctx.env.kvDao.getPendingProfessor(professorId);
            professor.department = department;
            await ctx.env.kvDao.putPendingProfessor(professor);
        }),
    changeProfessorName: protectedProcedure
        .input(changeNameParser)
        .mutation(async ({ ctx, input: { professorId, firstName, lastName } }) => {
            const professor = await ctx.env.kvDao.getProfessor(professorId);
            professor.firstName = firstName;
            professor.lastName = lastName;
            await ctx.env.kvDao.putProfessor(professor, true);
        }),
    changePendingProfessorName: protectedProcedure
        .input(changeNameParser)
        .mutation(async ({ ctx, input: { professorId, firstName, lastName } }) => {
            const professor = await ctx.env.kvDao.getPendingProfessor(professorId);
            professor.firstName = firstName;
            professor.lastName = lastName;
            await ctx.env.kvDao.putPendingProfessor(professor);
        }),
    getBulkKeys: protectedProcedure
        .input(z.enum(bulkKeys))
        .query(({ input, ctx }) => ctx.env.kvDao.getBulkKeys(input)),
    // Mark as mutation to not have url issues
    getBulkValues: protectedProcedure
        .input(z.object({ bulkKey: z.enum(bulkKeys), keys: z.string().array() }))
        .mutation(async ({ ctx, input: { bulkKey, keys } }) =>
            ctx.env.kvDao.getBulkValues(bulkKey, keys),
        ),
    removeReport: protectedProcedure.input(z.uuid()).mutation(async ({ ctx, input }) => {
        await ctx.env.kvDao.removeReport(input);
    }),
    actOnReport: protectedProcedure.input(z.uuid()).mutation(async ({ ctx, input }) => {
        const report = await ctx.env.kvDao.getReport(input);
        await ctx.env.kvDao.removeRating(report.professorId, report.ratingId);
        await ctx.env.kvDao.removeReport(input);
    }),
    fixEscapedChars: protectedProcedure
        .input(fixEscapedCharsParser)
        .mutation(async ({ ctx, input }) => {
            for (const profId of input.professors) {
                // eslint-disable-next-line no-await-in-loop
                const professor = await ctx.env.kvDao.getProfessor(profId);
                for (const [course, ratings] of Object.entries(professor.reviews)) {
                    professor.reviews[course] = ratings.map((rating) => {
                        // eslint-disable-next-line
                        rating.rating = rating.rating.replaceAll("\\'", "'").replaceAll('\\"', '"');
                        return rating;
                    });
                }

                // eslint-disable-next-line no-await-in-loop
                await ctx.env.kvDao.putProfessor(professor, true);
            }
        }),

    // Audits
    autoReportDuplicateUsers: protectedProcedure
        .input(z.object({ cursor: z.string().optional() }).optional())
        .mutation(async ({ ctx, input }) => {
            const BATCH_PROFESSOR_SIZE = 25;
            // Note: The getAllProfessors list could become out of sync if there are concurrent
            // writes to the database (e.g., new professors added or removed) between when we fetch
            // the list and when we process individual batches. This is acceptable for this audit
            // use case since we're running a point-in-time scan.

            return processAuditBatch(ctx, input, BATCH_PROFESSOR_SIZE, async (professors) => {
                const reportTasks: Promise<void>[] = [];
                let processedCount = 0;
                let duplicatesFound = 0;

                // Track ratingIds we've already reported in this batch to avoid duplicates
                const reportedRatingIds = new Set<string>();

                // Process each professor in the chunk
                for (const professor of professors) {
                    // eslint-disable-next-line no-continue
                    if (!professor) continue; // Skip null professors

                    processedCount += 1;

                    // Group ratings by anonymous ID
                    const anonymousIdMap = new Map<
                        string,
                        {
                            ratingId: string;
                            postDate: string;
                            rating: Rating & Partial<PendingRating>;
                        }[]
                    >();

                    // Collect all ratings by anonymousIdentifier
                    Object.values(professor.reviews).forEach((ratings: Rating[]) => {
                        ratings.forEach((rating: Rating) => {
                            if (rating.anonymousIdentifier) {
                                let arr = anonymousIdMap.get(rating.anonymousIdentifier);
                                if (!arr) {
                                    arr = [];
                                    anonymousIdMap.set(rating.anonymousIdentifier, arr);
                                }
                                arr.push({
                                    ratingId: rating.id,
                                    postDate: rating.postDate,
                                    rating,
                                });
                            }
                        });
                    });

                    // Find duplicates and create reports
                    // Only report duplicates if timestamps are within 2 days of each other
                    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

                    for (const [anonymousId, ratings] of anonymousIdMap) {
                        if (ratings.length > 1) {
                            // Sort ratings by postDate to make comparison easier
                            const sortedRatings = [...ratings].sort(
                                (a, b) =>
                                    new Date(a.postDate).getTime() - new Date(b.postDate).getTime(),
                            );

                            // Check if time span from first to last rating is within 2 days
                            const firstTime = new Date(sortedRatings[0].postDate).getTime();
                            const lastTime = new Date(
                                sortedRatings[sortedRatings.length - 1].postDate,
                            ).getTime();
                            const timeSpan = lastTime - firstTime;

                            if (timeSpan <= TWO_DAYS_MS) {
                                for (const ratingInfo of sortedRatings) {
                                    // Skip if we've already reported this rating in this batch
                                    if (reportedRatingIds.has(ratingInfo.ratingId)) {
                                        // eslint-disable-next-line no-continue
                                        continue;
                                    }

                                    // Mark as reported
                                    reportedRatingIds.add(ratingInfo.ratingId);

                                    // Increment counter when creating a report
                                    duplicatesFound += 1;

                                    // Reason for report: multiple ratings by same anonymous user within 2 days
                                    // List all timestamps
                                    const allTimestamps = sortedRatings
                                        .map((r) => r.postDate)
                                        .join("\n");
                                    const reason =
                                        `[AUTOMATED] ${sortedRatings.length} ratings submitted by user ${anonymousId} ` +
                                        `under this professor within 2 days. Timestamps: ${allTimestamps}`;
                                    const ratingReport = {
                                        ratingId: ratingInfo.ratingId,
                                        professorId: professor.id,
                                        reports: [
                                            {
                                                email: null,
                                                reason,
                                                anonymousIdentifier: anonymousId,
                                            },
                                        ],
                                    };
                                    reportTasks.push(ctx.env.kvDao.putReport(ratingReport));
                                }
                            }
                        }
                    }
                }

                return {
                    reportTasks,
                    processedCount,
                    metrics: { duplicatesFound },
                    messagePart: `found ${duplicatesFound} duplicate ratings`,
                };
            });
        }),
    autoReportContentModeration: protectedProcedure
        .input(z.object({ cursor: z.string().optional() }).optional())
        .mutation(async ({ ctx, input }) => {
            const MAX_HARASSMENT = 0.65;
            const BATCH_PROFESSOR_SIZE = 25;

            return processAuditBatch(ctx, input, BATCH_PROFESSOR_SIZE, async (professors) => {
                const reportTasks: Promise<void>[] = [];
                let processedCount = 0;
                let moderationFlagged = 0;

                // Track ratingIds we've already reported in this batch to avoid duplicates
                const reportedRatingIds = new Set<string>();

                // Process each professor in the chunk
                for (const professor of professors) {
                    // eslint-disable-next-line no-continue
                    if (!professor) continue; // Skip null professors

                    processedCount += 1;

                    const ratingMap: Record<string, PendingRating> = {};

                    // Collect all ratings by anonymousIdentifier
                    Object.values<(Rating & Partial<PendingRating>)[]>(professor.reviews).forEach(
                        (ratings) => {
                            ratings.forEach((rating) => {
                                if (
                                    !rating.analyzedScores ||
                                    !("category_scores" in rating.analyzedScores)
                                ) {
                                    ratingMap[rating.id] = {
                                        ...rating,
                                        status: rating.status ?? "Successful",
                                        error: rating.error ?? null,
                                        analyzedScores: rating.analyzedScores ?? null,
                                        courseNum: rating.courseNum ?? 0,
                                        department: rating.department ?? "AEPS",
                                    };
                                }
                            });
                        },
                    );

                    // Only re-analyze if not already analyzed or no scores
                    const ratings = Object.values(ratingMap);

                    // eslint-disable-next-line no-await-in-loop
                    const analyzedScores = await ctx.env.ratingAnalyzer.analyzeRatings(ratings);

                    for (let i = 0; i < ratings.length; i += 1) {
                        const rating = ratings[i];
                        const scores = analyzedScores[i];

                        // Check if it should be flagged for moderation report
                        if (
                            scores &&
                            scores.flagged &&
                            scores.categories.harassment &&
                            scores.category_scores.harassment >= MAX_HARASSMENT
                        ) {
                            // Skip if we've already reported this rating in this batch
                            if (reportedRatingIds.has(rating.id)) {
                                // eslint-disable-next-line no-continue
                                continue;
                            }

                            // Mark as reported
                            reportedRatingIds.add(rating.id);

                            // Increment counter when creating a report
                            moderationFlagged += 1;

                            const reason =
                                "[AUTOMATED] Content moderation flagged this rating. " +
                                `Harassment score: ${scores.category_scores.harassment.toFixed(3)}.`;

                            const ratingReport = {
                                ratingId: rating.id,
                                professorId: professor.id,
                                reports: [
                                    {
                                        email: null,
                                        reason,
                                        anonymousIdentifier: rating.anonymousIdentifier,
                                    },
                                ],
                            };
                            reportTasks.push(ctx.env.kvDao.putReport(ratingReport));
                        }
                    }
                }

                return {
                    reportTasks,
                    processedCount,
                    metrics: { moderationFlagged },
                    messagePart: `found ${moderationFlagged} ratings to flag`,
                };
            });
        }),
});
