import { t, protectedProcedure, type Context } from "@backend/trpc";
import { z } from "zod";
import { addRating } from "@backend/types/schemaHelpers";
import { bulkKeys, DEPARTMENT_LIST } from "@backend/utils/const";
import { TRPCError } from "@trpc/server";
import { Professor, professorParser, RatingReport } from "@backend/types/schema";
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
});
