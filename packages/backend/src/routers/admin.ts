import { t, protectedProcedure } from "@backend/trpc";
import { z } from "zod";
import { addRating } from "@backend/types/schemaHelpers";
import { bulkKeys, DEPARTMENT_LIST } from "@backend/utils/const";
import { PendingRating, Rating } from "@backend/types/schema";

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
            // OpenAI Moderation API limits: 500 RPM, 10,000 RPD, 10,000 TPM
            // Conservative batch size to stay well under limits
            const BATCH_SIZE = 25; // Reduced further to account for moderation API limits
            const MODERATION_DELAY_MS = 150; // ~400 requests/min to stay under 500 RPM limit
            let duplicatesFound = 0;
            let moderationFlagged = 0;
            let processedCount = 0;
            const MAX_HARASSMENT = 0.65;

            // Get professors using cursor-based pagination
            const profs = await ctx.env.kvDao.getAllProfessors();

            // Find starting index based on cursor
            let startIndex = 0;
            if (input?.cursor) {
                const cursorIndex = profs.findIndex((p) => p.id === input.cursor);
                startIndex = cursorIndex >= 0 ? cursorIndex : 0;
            }

            // Process batch of professors
            const endIndex = Math.min(startIndex + BATCH_SIZE, profs.length);
            const batchProfessors = profs.slice(startIndex, endIndex);
            const professorIds = batchProfessors.map((p) => p.id);

            // Fetch professor data in smaller chunks to avoid KV limits
            const FETCH_CHUNK_SIZE = 25; // Reduced chunk size for additional operations
            const reportTasks: Promise<void>[] = [];
            const professorUpdateTasks: Promise<unknown>[] = [];

            for (let i = 0; i < professorIds.length; i += FETCH_CHUNK_SIZE) {
                const chunk = professorIds.slice(i, i + FETCH_CHUNK_SIZE);

                // eslint-disable-next-line no-await-in-loop
                const professors = await ctx.env.kvDao.getBulkValues("professors", chunk);

                // Process each professor in the chunk
                for (const professor of professors) {
                    // eslint-disable-next-line no-continue
                    if (!professor) continue; // Skip null professors

                    processedCount += 1;

                    const anonymousIdMap = new Map<
                        string,
                        {
                            ratingId: string;
                            postDate: string;
                            course: string;
                            rating: Rating & Partial<PendingRating>;
                        }[]
                    >();

                    // Collect all ratings by anonymousIdentifier
                    Object.entries(professor.reviews).forEach(([course, ratings]) => {
                        ratings.forEach((rating) => {
                            let arr = anonymousIdMap.get(rating.anonymousIdentifier ?? "unknown");
                            if (!arr) {
                                arr = [];
                                anonymousIdMap.set(rating.anonymousIdentifier ?? "unknown", arr);
                            }
                            arr.push({
                                ratingId: rating.id,
                                postDate: rating.postDate,
                                course,
                                rating,
                            });
                        });
                    });

                    let professorNeedsUpdate = false;

                    // Find duplicates and create reports
                    for (const [anonymousId, ratings] of anonymousIdMap) {
                        if (anonymousId !== "unknown" && ratings.length > 1) {
                            duplicatesFound += ratings.length;

                            ratings.forEach((ratingInfo) => {
                                // Reason for report: multiple ratings by same anonymous user
                                const reason =
                                    `[AUTOMATED] ${ratings.length} ratings submitted by user ${anonymousId} ` +
                                    `under this professor. This review's timestamp: ${ratingInfo.postDate}`;
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
                            });
                        } else {
                            // Single rating - run through moderation for non-duplicates
                            const ratingInfo = ratings[0];
                            const { rating } = ratingInfo;

                            // Only re-analyze if not already analyzed or no scores
                            if (!rating.analyzedScores) {
                                // Rate limit moderation API calls to stay under 500 RPM
                                // eslint-disable-next-line no-await-in-loop
                                await new Promise((resolve) => {
                                    setTimeout(resolve, MODERATION_DELAY_MS);
                                });

                                // eslint-disable-next-line no-await-in-loop
                                const analyzedScores = await ctx.env.ratingAnalyzer.analyzeRating({
                                    ...rating,
                                    status: rating.status ?? "Successful",
                                    error: rating.error ?? null,
                                    analyzedScores: rating.analyzedScores ?? null,
                                    courseNum: rating.courseNum ?? 0,
                                    department: rating.department ?? "AEPS",
                                });

                                if (analyzedScores) {
                                    // Update the rating with analyzed scores
                                    rating.analyzedScores = analyzedScores;
                                    professorNeedsUpdate = true;

                                    // Check if it should be flagged for moderation report
                                    if (
                                        analyzedScores.flagged &&
                                        analyzedScores.categories.harassment &&
                                        analyzedScores.category_scores.harassment >= MAX_HARASSMENT
                                    ) {
                                        moderationFlagged += 1;

                                        const reason =
                                            "[AUTOMATED] Content moderation flagged this rating. " +
                                            `Harassment score: ${analyzedScores.category_scores.harassment.toFixed(3)}.`;

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
                        }
                    }

                    // Queue professor update if any ratings were modified
                    if (professorNeedsUpdate) {
                        professorUpdateTasks.push(ctx.env.kvDao.putProfessor(professor, true));
                    }
                }
            }

            // Execute all report writes for this batch
            await Promise.all(reportTasks);

            // Execute all professor updates for this batch
            await Promise.all(professorUpdateTasks);
            // Determine if there are more professors to process
            const hasMore = endIndex < profs.length;
            const nextCursor = hasMore ? profs[endIndex].id : null;

            return {
                processedCount,
                duplicatesFound,
                moderationFlagged,
                totalProfessors: profs.length,
                hasMore,
                nextCursor,
                message:
                    `Processed ${processedCount} professors, ` +
                    `found ${duplicatesFound} duplicate ratings, ` +
                    `flagged ${moderationFlagged} for moderation` +
                    `${hasMore ? ". Call again with nextCursor to continue." : ". Audit complete."}`,
            };
        }),
});
