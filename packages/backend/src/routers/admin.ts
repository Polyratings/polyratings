import { t, protectedProcedure, type Context } from "@backend/trpc";
import { z } from "zod";
import type { Moderation } from "openai/resources/moderations";
import { addRating } from "@backend/types/schemaHelpers";
import { bulkKeys, DEPARTMENT_LIST } from "@backend/utils/const";
import { checkModerationThresholds } from "@backend/utils/moderation";
import { TRPCError } from "@trpc/server";
import {
    PendingRating,
    Rating,
    Professor,
    TruncatedProfessor,
    professorParser,
    RatingReport,
} from "@backend/types/schema";
import {
    bulkRatingDeletionNotification,
    adminRatingDeletionNotification,
    findRating,
    findRatingCourse,
} from "@backend/utils/discordNotifications";

const changeDepartmentParser = z.object({
    professorId: z.uuid(),
    department: z.enum(DEPARTMENT_LIST),
});

const changeNameParser = z.object({
    professorId: z.uuid(),
    firstName: z.string().trim(),
    lastName: z.string().trim(),
});

const lockProfessorParser = z.object({
    professorId: z.uuid(),
    locked: z.boolean(),
    lockedMessage: z.string().optional(),
});

const fixEscapedCharsParser = z.object({
    professors: z
        .array(z.uuid())
        .min(1)
        .max(250, "Separate your request into batches of 250 professors."),
});

const MAX_REASON_LENGTH = 600;

function getProfessorRatingIds(professor: Professor): Set<string> {
    return new Set(
        Object.values(professor.reviews).flatMap((ratings) => ratings.map((rating) => rating.id)),
    );
}

async function requireProfessor(ctx: Context, professorId: string): Promise<Professor> {
    const professor = await ctx.env.kvDao.getProfessorOptional(professorId);
    if (!professor) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: `Professor with id ${professorId} does not exist.`,
        });
    }
    return professor;
}

async function requirePendingProfessor(ctx: Context, professorId: string): Promise<Professor> {
    const professor = await ctx.env.kvDao.getPendingProfessorOptional(professorId);
    if (!professor) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: `Pending professor with id ${professorId} does not exist.`,
        });
    }
    return professor;
}

async function requireReport(ctx: Context, reportId: string): Promise<RatingReport> {
    const report = await ctx.env.kvDao.getReportOptional(reportId);
    if (!report) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: `Report for rating id ${reportId} does not exist.`,
        });
    }
    return report;
}

async function removeReportBestEffort(
    kvDao: { removeReport(ratingId: string): Promise<void> },
    ratingId: string,
): Promise<void> {
    try {
        await kvDao.removeReport(ratingId);
    } catch (error) {
        // Do not fail the primary deletion path if report cleanup fails; the
        // report can be retried by future moderation actions. Log so the
        // failure is visible in Workers tails / Sentry.
        // eslint-disable-next-line no-console
        console.error(
            `Best-effort removeReport failed for ratingId=${ratingId}:`,
            error instanceof Error ? (error.stack ?? error.message) : error,
        );
    }
}

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
        .input(z.object({ professorId: z.uuid(), ratingId: z.uuid() }))
        .mutation(async ({ ctx, input: { professorId, ratingId } }) => {
            const professor = await requireProfessor(ctx, professorId);
            if (!getProfessorRatingIds(professor).has(ratingId)) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `Rating with id ${ratingId} does not exist on professor ${professorId}.`,
                });
            }
            const rating = findRating(professor.reviews, ratingId);
            const course = findRatingCourse(professor.reviews, ratingId) ?? "Unknown course";
            await ctx.env.kvDao.removeRatingWithProfessor(professor, ratingId);
            await removeReportBestEffort(ctx.env.kvDao, ratingId);
            if (rating) {
                await ctx.env.notificationDAO.notify(
                    adminRatingDeletionNotification(ctx.user!.username, professor, course, rating),
                );
            }
        }),
    removeRatingsBulk: protectedProcedure
        .input(
            z.object({
                professorId: z.uuid(),
                ratingIds: z.array(z.uuid()).min(1).max(50),
                reason: z
                    .string()
                    .trim()
                    .min(1, "Reason is required")
                    .max(
                        MAX_REASON_LENGTH,
                        `Reason must be at most ${MAX_REASON_LENGTH} characters`,
                    ),
            }),
        )
        .mutation(async ({ ctx, input: { professorId, ratingIds, reason } }) => {
            const professor = await requireProfessor(ctx, professorId);
            const existingRatingIds = getProfessorRatingIds(professor);
            const removedRatingIds = [
                ...new Set(ratingIds.filter((ratingId) => existingRatingIds.has(ratingId))),
            ];
            if (removedRatingIds.length === 0) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message:
                        "None of the requested ratings exist on this professor. They may have already been deleted.",
                });
            }
            const removed = await ctx.env.kvDao.removeRatingsBulk(professor, ratingIds);
            await Promise.all(
                removedRatingIds.map((ratingId) => removeReportBestEffort(ctx.env.kvDao, ratingId)),
            );
            await ctx.env.notificationDAO.notify(
                bulkRatingDeletionNotification(
                    ctx.user!.username,
                    removed,
                    professor,
                    removedRatingIds,
                    reason,
                ),
            );
        }),
    getPendingProfessors: protectedProcedure.query(({ ctx }) =>
        ctx.env.kvDao.getAllPendingProfessors(),
    ),
    approvePendingProfessor: protectedProcedure.input(z.uuid()).mutation(async ({ ctx, input }) => {
        const pendingProfessor = await requirePendingProfessor(ctx, input);

        await ctx.env.kvDao.putProfessor(pendingProfessor);
        await ctx.env.kvDao.removePendingProfessor(input);
    }),
    rejectPendingProfessor: protectedProcedure.input(z.uuid()).mutation(async ({ input, ctx }) => {
        await ctx.env.kvDao.removePendingProfessor(input);
    }),
    /**
     * Copy every rating from a pending professor onto an existing professor in a
     * single KV read-modify-write, then remove the pending record.
     * Idempotent on rating id so a retry after a failed pending-delete is safe.
     */
    submitPendingUnderProfessor: protectedProcedure
        .input(z.object({ destId: z.uuid(), sourceId: z.uuid() }))
        .mutation(async ({ ctx, input: { destId, sourceId } }) => {
            const [destProfessor, sourceProfessor] = await Promise.all([
                requireProfessor(ctx, destId),
                requirePendingProfessor(ctx, sourceId),
            ]);

            if (destProfessor.locked) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "This professor is locked and not accepting new ratings.",
                });
            }

            const sourceRatings = Object.values(sourceProfessor.reviews).flat();
            if (sourceRatings.length === 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Pending professor has no ratings to submit.",
                });
            }

            const existingIds = getProfessorRatingIds(destProfessor);
            let copied = 0;
            Object.entries(sourceProfessor.reviews).forEach(([course, ratings]) => {
                ratings.forEach((rating) => {
                    if (!existingIds.has(rating.id)) {
                        addRating(destProfessor, rating, course);
                        copied += 1;
                    }
                });
            });

            if (copied > 0) {
                await ctx.env.kvDao.putProfessor(destProfessor);
            }
            await ctx.env.kvDao.removePendingProfessor(sourceId);
        }),
    removeProfessor: protectedProcedure.input(z.uuid()).mutation(async ({ input, ctx }) => {
        await ctx.env.kvDao.removeProfessor(input);
    }),

    // Takes reviews of target professor and applies them to dest and then removes the target professor
    mergeProfessor: protectedProcedure
        .input(z.object({ destId: z.uuid(), sourceId: z.uuid() }))
        .mutation(async ({ ctx, input: { destId, sourceId } }) => {
            const [destProfessor, sourceProfessor] = await Promise.all([
                requireProfessor(ctx, destId),
                requireProfessor(ctx, sourceId),
            ]);

            Object.entries(sourceProfessor.reviews).forEach(([course, ratings]) => {
                ratings.forEach((rating) => addRating(destProfessor, rating, course));
            });

            await ctx.env.kvDao.putProfessor(destProfessor);
            await ctx.env.kvDao.removeProfessor(sourceProfessor.id);
        }),
    changeProfessorDepartment: protectedProcedure
        .input(changeDepartmentParser)
        .mutation(async ({ ctx, input: { professorId, department } }) => {
            const professor = await requireProfessor(ctx, professorId);
            professor.department = department;
            await ctx.env.kvDao.putProfessor(professor);
        }),
    changePendingProfessorDepartment: protectedProcedure
        .input(changeDepartmentParser)
        .mutation(async ({ ctx, input: { professorId, department } }) => {
            const professor = await requirePendingProfessor(ctx, professorId);
            professor.department = department;
            await ctx.env.kvDao.putPendingProfessor(professor);
        }),
    changeProfessorName: protectedProcedure
        .input(changeNameParser)
        .mutation(async ({ ctx, input: { professorId, firstName, lastName } }) => {
            const professor = await requireProfessor(ctx, professorId);
            professor.firstName = firstName;
            professor.lastName = lastName;
            await ctx.env.kvDao.putProfessor(professor, { skipNameCollisionDetection: true });
        }),
    changePendingProfessorName: protectedProcedure
        .input(changeNameParser)
        .mutation(async ({ ctx, input: { professorId, firstName, lastName } }) => {
            const professor = await requirePendingProfessor(ctx, professorId);
            professor.firstName = firstName;
            professor.lastName = lastName;
            await ctx.env.kvDao.putPendingProfessor(professor);
        }),
    lockProfessor: protectedProcedure
        .input(lockProfessorParser)
        .mutation(async ({ ctx, input: { professorId, locked, lockedMessage } }) => {
            const professor = await requireProfessor(ctx, professorId);
            professor.locked = locked;
            professor.lockedMessage = locked ? lockedMessage : undefined;
            await ctx.env.kvDao.putProfessor(professor);
        }),
    getBulkKeys: protectedProcedure
        .input(z.enum(bulkKeys))
        .query(({ input, ctx }) => ctx.env.kvDao.getBulkKeys(input)),
    // Mark as mutation to not have url issues
    getBulkValues: protectedProcedure
        .input(z.object({ bulkKey: z.enum(bulkKeys), keys: z.string().array() }))
        .mutation(({ ctx, input: { bulkKey, keys } }) =>
            ctx.env.kvDao.getBulkValues(bulkKey, keys),
        ),
    getProfessors: protectedProcedure
        .input(z.object({ ids: z.uuid().array() }))
        .output(
            z.object({
                professors: professorParser.array(),
                missingIds: z.uuid().array(),
            }),
        )
        .query(async ({ input, ctx }) => {
            const results = await Promise.all(
                input.ids.map((id) => ctx.env.kvDao.getProfessorOptional(id)),
            );
            return {
                professors: results.filter((p): p is Professor => p !== undefined),
                missingIds: input.ids.filter((_, index) => !results[index]),
            };
        }),
    removeReport: protectedProcedure.input(z.uuid()).mutation(async ({ ctx, input }) => {
        await ctx.env.kvDao.removeReport(input);
    }),
    actOnReport: protectedProcedure.input(z.uuid()).mutation(async ({ ctx, input }) => {
        const report = await requireReport(ctx, input);
        const professor = await ctx.env.kvDao.getProfessorOptional(report.professorId);
        if (!professor) {
            await removeReportBestEffort(ctx.env.kvDao, input);
            return;
        }
        if (!getProfessorRatingIds(professor).has(report.ratingId)) {
            await removeReportBestEffort(ctx.env.kvDao, input);
            return;
        }
        await ctx.env.kvDao.removeRatingWithProfessor(professor, report.ratingId);
        await removeReportBestEffort(ctx.env.kvDao, input);
    }),
    fixEscapedChars: protectedProcedure
        .input(fixEscapedCharsParser)
        .output(
            z.object({
                updated: z.uuid().array(),
                skipped: z.uuid().array(),
                failed: z.array(z.object({ profId: z.uuid(), message: z.string() })),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const professors = await Promise.all(
                input.professors.map((profId) => ctx.env.kvDao.getProfessorOptional(profId)),
            );
            const missingIds = input.professors.filter((_, idx) => !professors[idx]);
            if (missingIds.length > 0) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `Unknown professor id(s): ${missingIds.join(", ")}`,
                });
            }

            const updates: Array<{ id: string; professor: Professor }> = [];
            const skipped: string[] = [];
            const failed: Array<{ profId: string; message: string }> = [];

            (professors as Professor[]).forEach((professor, i) => {
                const profId = input.professors[i];
                try {
                    let hasChanges = false;

                    const processRatings = (ratings: (typeof professor.reviews)[string]) =>
                        ratings.map((rating) => {
                            const originalRating = rating.rating;
                            const fixedRating = rating.rating
                                .replaceAll("\\'", "'")
                                // eslint-disable-next-line
                                .replaceAll('\\"', '"');
                            if (originalRating !== fixedRating) {
                                hasChanges = true;
                            }
                            return { ...rating, rating: fixedRating };
                        });

                    for (const [course, ratings] of Object.entries(professor.reviews)) {
                        professor.reviews[course] = processRatings(ratings);
                    }

                    if (hasChanges) {
                        updates.push({ id: profId, professor });
                    } else {
                        skipped.push(profId);
                    }
                } catch (error) {
                    failed.push({
                        profId,
                        message:
                            error instanceof Error ? error.message : "Failed to process professor",
                    });
                }
            });

            if (updates.length > 0) {
                await ctx.env.kvDao.batchUpdateProfessors(
                    updates.map((u) => ({ id: u.id, professor: u.professor })),
                );
            }

            return {
                updated: updates.map((u) => u.id),
                skipped,
                failed,
            };
        }),

    // Audits
    autoReportDuplicateUsers: protectedProcedure
        .input(
            z
                .object({
                    cursor: z.string().optional(),
                    withinSeconds: z.number().min(1).optional(),
                    rangeLabel: z.string().optional(),
                })
                .optional(),
        )
        .mutation(async ({ ctx, input }) => {
            const BATCH_PROFESSOR_SIZE = 25;
            const withinSeconds = input?.withinSeconds ?? 86400;
            const withinMs = withinSeconds * 1000;
            const rangeLabel = input?.rangeLabel ?? `${withinSeconds}s`;
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
                    // Only report duplicates if timestamps are within the selected time range
                    for (const [anonymousId, ratings] of anonymousIdMap) {
                        if (ratings.length > 1) {
                            // Sort ratings by postDate to make comparison easier
                            const sortedRatings = [...ratings].sort(
                                (a, b) =>
                                    new Date(a.postDate).getTime() - new Date(b.postDate).getTime(),
                            );

                            // Check if time span from first to last rating is within the selected range
                            const firstTime = new Date(sortedRatings[0].postDate).getTime();
                            const lastTime = new Date(
                                sortedRatings[sortedRatings.length - 1].postDate,
                            ).getTime();
                            const timeSpan = lastTime - firstTime;

                            if (timeSpan <= withinMs) {
                                for (const ratingInfo of sortedRatings) {
                                    // Skip if we've already reported this rating in this batch
                                    if (reportedRatingIds.has(ratingInfo.ratingId)) {
                                        // eslint-disable-next-line no-continue
                                        continue;
                                    }

                                    // Skip if this rating already has a duplicate audit report (idempotent re-runs)
                                    // eslint-disable-next-line no-await-in-loop
                                    const existingReport = await ctx.env.kvDao.getReportOptional(
                                        ratingInfo.ratingId,
                                    );
                                    const hasDuplicateReport =
                                        existingReport?.reports.some((r) =>
                                            r.reason.includes("[AUTOMATED/Dedupe]"),
                                        ) ?? false;
                                    if (hasDuplicateReport) {
                                        // eslint-disable-next-line no-continue
                                        continue;
                                    }

                                    // Mark as reported
                                    reportedRatingIds.add(ratingInfo.ratingId);

                                    // Increment counter when creating a report
                                    duplicatesFound += 1;

                                    const allTimestamps = sortedRatings
                                        .map((r) => r.postDate)
                                        .join("\n");
                                    const reason =
                                        `[AUTOMATED/Dedupe] ${sortedRatings.length} ratings by user ${anonymousId} ` +
                                        `in ${rangeLabel}. Timestamps: ${allTimestamps}`;
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
            const BATCH_PROFESSOR_SIZE = 25;

            const pushModerationReport = (
                rating: { id: string; anonymousIdentifier?: string },
                professor: Professor,
                reason: string,
            ) =>
                ctx.env.kvDao.putReport({
                    ratingId: rating.id,
                    professorId: professor.id,
                    reports: [
                        {
                            email: null,
                            reason: `[AUTOMATED/Content] ${reason}`,
                            anonymousIdentifier: rating.anonymousIdentifier,
                        },
                    ],
                });

            return processAuditBatch(ctx, input, BATCH_PROFESSOR_SIZE, async (professors) => {
                const reportTasks: Promise<void>[] = [];
                let processedCount = 0;
                let moderationFlagged = 0;
                const reportedRatingIds = new Set<string>();

                const maybeFlag = async (
                    rating: { id: string; anonymousIdentifier?: string },
                    professor: Professor,
                    reason: string,
                ) => {
                    if (reportedRatingIds.has(rating.id)) return;

                    // Skip if this rating already has a content moderation audit report (idempotent re-runs)
                    const existingReport = await ctx.env.kvDao.getReportOptional(rating.id);
                    const hasModerationReport =
                        existingReport?.reports.some((r) =>
                            r.reason.includes("[AUTOMATED/Content]"),
                        ) ?? false;
                    if (hasModerationReport) return;

                    reportedRatingIds.add(rating.id);
                    moderationFlagged += 1;
                    reportTasks.push(pushModerationReport(rating, professor, reason));
                };

                for (const professor of professors) {
                    // eslint-disable-next-line no-continue
                    if (!professor) continue; // Skip null professors

                    processedCount += 1;
                    const ratingMap: Record<string, PendingRating> = {};
                    const reviewRatings = Object.values(professor.reviews) as (Rating &
                        Partial<PendingRating>)[][];

                    for (const ratings of reviewRatings) {
                        for (const rating of ratings) {
                            const categoryScores = rating.analyzedScores as
                                | Moderation.CategoryScores
                                | undefined;
                            if (categoryScores && typeof categoryScores === "object") {
                                const violation = checkModerationThresholds(categoryScores);
                                if (violation) {
                                    // eslint-disable-next-line no-await-in-loop
                                    await maybeFlag(rating, professor, violation.reason);
                                }
                            } else {
                                ratingMap[rating.id] = {
                                    ...rating,
                                    status: rating.status ?? "Successful",
                                    error: rating.error ?? null,
                                    analyzedScores: rating.analyzedScores ?? null,
                                    courseNum: rating.courseNum ?? 0,
                                    department: rating.department ?? "AEPS",
                                };
                            }
                        }
                    }

                    const ratings = Object.values(ratingMap);
                    if (ratings.length === 0) {
                        // eslint-disable-next-line no-continue
                        continue;
                    }

                    // eslint-disable-next-line no-await-in-loop
                    const analyzedScores = await ctx.env.ratingAnalyzer.analyzeRatings(ratings);

                    for (let i = 0; i < ratings.length; i += 1) {
                        const rating = ratings[i];
                        const scores = analyzedScores[i];
                        if (scores?.category_scores) {
                            const violation = checkModerationThresholds(scores.category_scores);
                            if (violation) {
                                const shortReason =
                                    violation.score <= 1
                                        ? `${violation.category}: ${(violation.score * 100).toFixed(1)}%`
                                        : `${violation.category}: ${violation.score.toFixed(2)}`;
                                // eslint-disable-next-line no-await-in-loop
                                await maybeFlag(rating, professor, shortReason);
                            }
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
