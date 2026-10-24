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

const AUDIT_REPORT_LOOKUP_CHUNK = 1000;

/** Prefetch existing reports for many rating IDs (missing keys omitted). */
async function getReportsByRatingIds(
    ctx: Context,
    ratingIds: string[],
): Promise<Map<string, RatingReport>> {
    const uniqueIds = [...new Set(ratingIds)];
    const reportsById = new Map<string, RatingReport>();

    for (let i = 0; i < uniqueIds.length; i += AUDIT_REPORT_LOOKUP_CHUNK) {
        const chunk = uniqueIds.slice(i, i + AUDIT_REPORT_LOOKUP_CHUNK);
        // eslint-disable-next-line no-await-in-loop -- chunked to respect KV bulk limits
        const entries = await ctx.env.kvDao.getBulkValues("reports", chunk);
        for (const { key, value } of entries) {
            reportsById.set(key, value);
        }
    }

    return reportsById;
}

function hasAutomatedReport(report: RatingReport | undefined, tag: string): boolean {
    return report?.reports.some((r) => r.reason.includes(tag)) ?? false;
}

/**
 * Ratings whose postDate falls in any sliding window of size >= 2 within `withinMs`.
 * Uses pairwise/cluster proximity — not first-to-last span of the entire user history.
 */
function ratingIdsInDuplicateWindows<T extends { ratingId: string; postDate: string }>(
    ratings: T[],
    withinMs: number,
): Set<string> {
    const sorted = [...ratings].sort(
        (a, b) => new Date(a.postDate).getTime() - new Date(b.postDate).getTime(),
    );
    const toReport = new Set<string>();
    let left = 0;

    for (let right = 0; right < sorted.length; right += 1) {
        const rightTime = new Date(sorted[right].postDate).getTime();
        while (rightTime - new Date(sorted[left].postDate).getTime() > withinMs) {
            left += 1;
        }
        if (right > left) {
            for (let i = left; i <= right; i += 1) {
                toReport.add(sorted[i].ratingId);
            }
        }
    }

    return toReport;
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
        if (cursorIndex === -1) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                    "Invalid or stale audit cursor: professor not found. Restart the audit from the beginning.",
            });
        }
        startIndex = cursorIndex;
    }

    // Process batch of professors
    const endIndex = Math.min(startIndex + batchSize, profs.length);
    const batchProfessors = profs.slice(startIndex, endIndex);
    const professorIds = batchProfessors.map((p: TruncatedProfessor) => p.id);

    const professorEntries = await ctx.env.kvDao.getBulkValues("professors", professorIds);
    const professorsById = new Map(professorEntries.map((entry) => [entry.key, entry.value]));
    // Preserve list order; omit IDs missing from KV (deleted between list fetch and bulk read).
    const professors = professorIds
        .map((id) => professorsById.get(id))
        .filter((p): p is Professor => p !== undefined);

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
            const withinSeconds = input?.withinSeconds ?? 600;
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

                const candidateReports: {
                    ratingId: string;
                    professorId: string;
                    anonymousId: string;
                    clusterTimestamps: string[];
                    clusterSize: number;
                }[] = [];

                // Process each professor in the chunk
                for (const professor of professors) {
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

                    // Report ratings that appear in any within-window cluster of 2+
                    for (const [anonymousId, ratings] of anonymousIdMap) {
                        if (ratings.length < 2) {
                            // eslint-disable-next-line no-continue
                            continue;
                        }

                        const duplicateIds = ratingIdsInDuplicateWindows(ratings, withinMs);
                        if (duplicateIds.size === 0) {
                            // eslint-disable-next-line no-continue
                            continue;
                        }

                        const clusterRatings = ratings
                            .filter((r) => duplicateIds.has(r.ratingId))
                            .sort(
                                (a, b) =>
                                    new Date(a.postDate).getTime() - new Date(b.postDate).getTime(),
                            );
                        const clusterTimestamps = clusterRatings.map((r) => r.postDate);

                        for (const ratingInfo of clusterRatings) {
                            if (reportedRatingIds.has(ratingInfo.ratingId)) {
                                // eslint-disable-next-line no-continue
                                continue;
                            }
                            reportedRatingIds.add(ratingInfo.ratingId);
                            candidateReports.push({
                                ratingId: ratingInfo.ratingId,
                                professorId: professor.id,
                                anonymousId,
                                clusterTimestamps,
                                clusterSize: clusterRatings.length,
                            });
                        }
                    }
                }

                const existingReports = await getReportsByRatingIds(
                    ctx,
                    candidateReports.map((r) => r.ratingId),
                );

                for (const ratingInfo of candidateReports) {
                    if (
                        hasAutomatedReport(
                            existingReports.get(ratingInfo.ratingId),
                            "[AUTOMATED/Dedupe]",
                        )
                    ) {
                        // eslint-disable-next-line no-continue
                        continue;
                    }

                    duplicatesFound += 1;
                    const reason =
                        `[AUTOMATED/Dedupe] ${ratingInfo.clusterSize} ratings by user ${ratingInfo.anonymousId} ` +
                        `with pairs within ${rangeLabel}. Timestamps: ${ratingInfo.clusterTimestamps.join("\n")}`;
                    reportTasks.push(
                        ctx.env.kvDao.putReport(
                            {
                                ratingId: ratingInfo.ratingId,
                                professorId: ratingInfo.professorId,
                                reports: [
                                    {
                                        email: null,
                                        reason,
                                        anonymousIdentifier: ratingInfo.anonymousId,
                                    },
                                ],
                            },
                            { existing: existingReports.get(ratingInfo.ratingId) },
                        ),
                    );
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

            return processAuditBatch(ctx, input, BATCH_PROFESSOR_SIZE, async (professors) => {
                const reportTasks: Promise<void>[] = [];
                let processedCount = 0;
                let moderationFlagged = 0;
                const reportedRatingIds = new Set<string>();
                const pendingFlags: {
                    rating: { id: string; anonymousIdentifier?: string };
                    professor: Professor;
                    reason: string;
                }[] = [];
                const needsAnalysis: {
                    rating: PendingRating;
                    professor: Professor;
                }[] = [];

                const queueFlag = (
                    rating: { id: string; anonymousIdentifier?: string },
                    professor: Professor,
                    reason: string,
                ) => {
                    if (reportedRatingIds.has(rating.id)) return;
                    reportedRatingIds.add(rating.id);
                    pendingFlags.push({ rating, professor, reason });
                };

                const allRatingIds = professors.flatMap((professor) =>
                    Object.values(professor.reviews).flatMap((ratings) =>
                        ratings.map((rating) => rating.id),
                    ),
                );
                // Prefetch before OpenAI so already-flagged ratings are skipped.
                const existingReports = await getReportsByRatingIds(ctx, allRatingIds);

                for (const professor of professors) {
                    processedCount += 1;
                    const reviewRatings = Object.values(professor.reviews) as (Rating &
                        Partial<PendingRating>)[][];

                    for (const ratings of reviewRatings) {
                        for (const rating of ratings) {
                            if (
                                hasAutomatedReport(
                                    existingReports.get(rating.id),
                                    "[AUTOMATED/Content]",
                                )
                            ) {
                                // eslint-disable-next-line no-continue
                                continue;
                            }

                            const categoryScores = rating.analyzedScores as
                                | Moderation.CategoryScores
                                | undefined;
                            if (categoryScores && typeof categoryScores === "object") {
                                const violation = checkModerationThresholds(categoryScores);
                                if (violation) {
                                    queueFlag(rating, professor, violation.reason);
                                }
                            } else {
                                needsAnalysis.push({
                                    rating: {
                                        ...rating,
                                        status: rating.status ?? "Successful",
                                        error: rating.error ?? null,
                                        analyzedScores: rating.analyzedScores ?? null,
                                        courseNum: rating.courseNum ?? 0,
                                        department: rating.department ?? "AEPS",
                                    },
                                    professor,
                                });
                            }
                        }
                    }
                }

                if (needsAnalysis.length > 0) {
                    const analyzedScores = await ctx.env.ratingAnalyzer.analyzeRatings(
                        needsAnalysis.map((entry) => entry.rating),
                    );

                    for (let i = 0; i < needsAnalysis.length; i += 1) {
                        const { rating, professor } = needsAnalysis[i];
                        const scores = analyzedScores[i];
                        if (scores?.category_scores) {
                            const violation = checkModerationThresholds(scores.category_scores);
                            if (violation) {
                                const shortReason =
                                    violation.score <= 1
                                        ? `${violation.category}: ${(violation.score * 100).toFixed(1)}%`
                                        : `${violation.category}: ${violation.score.toFixed(2)}`;
                                queueFlag(rating, professor, shortReason);
                            }
                        }
                    }
                }

                for (const { rating, professor, reason } of pendingFlags) {
                    moderationFlagged += 1;
                    reportTasks.push(
                        ctx.env.kvDao.putReport(
                            {
                                ratingId: rating.id,
                                professorId: professor.id,
                                reports: [
                                    {
                                        email: null,
                                        reason: `[AUTOMATED/Content] ${reason}`,
                                        anonymousIdentifier: rating.anonymousIdentifier,
                                    },
                                ],
                            },
                            { existing: existingReports.get(rating.id) },
                        ),
                    );
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
