import { t, protectedProcedure } from "@backend/trpc";
import { z } from "zod";
import { addRating } from "@backend/types/schemaHelpers";
import { bulkKeys, DEPARTMENT_LIST } from "@backend/utils/const";
import { ensureTRPCError } from "@backend/middleware/ensure-trpc-error";

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

const DISCORD_MESSAGE_MAX_LENGTH = 2000;
const MAX_IDS_IN_AUDIT = 10;
const MAX_REASON_LENGTH = 600;

function buildBulkDeletionAuditMessage(
    username: string,
    removed: number,
    lastName: string,
    firstName: string,
    professorId: string,
    ratingIds: string[],
    reason: string,
): string {
    const adminPart = `Admin **${username}** removed **${removed}** rating(s)`;
    const profPart = `from professor **${lastName}, ${firstName}** (${professorId}).`;
    const firstIds = ratingIds.slice(0, MAX_IDS_IN_AUDIT).join(", ");
    const idsSummary =
        ratingIds.length <= MAX_IDS_IN_AUDIT
            ? `Rating IDs: ${ratingIds.join(", ")}`
            : `Rating IDs (first ${MAX_IDS_IN_AUDIT}): ${firstIds} (and ${ratingIds.length - MAX_IDS_IN_AUDIT} more)`;
    const truncatedReason =
        reason.length > MAX_REASON_LENGTH ? `${reason.slice(0, MAX_REASON_LENGTH)}…` : reason;
    const reasonPart = `\nReason: ${truncatedReason}`;
    let message = `${adminPart} ${profPart} ${idsSummary}${reasonPart}`;
    if (message.length > DISCORD_MESSAGE_MAX_LENGTH) {
        message = `${message.slice(0, DISCORD_MESSAGE_MAX_LENGTH - 3)}…`;
    }
    return message;
}

export const adminRouter = t.router({
    removeRating: protectedProcedure
        .input(z.object({ professorId: z.string(), ratingId: z.string() }))
        .mutation(
            ensureTRPCError(async ({ ctx, input: { professorId, ratingId } }) => {
                await ctx.env.kvDao.removeRating(professorId, ratingId);
            }, "Failed to remove rating"),
        ),
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
        .mutation(
            ensureTRPCError(async ({ ctx, input: { professorId, ratingIds, reason } }) => {
                const professor = await ctx.env.kvDao.getProfessor(professorId);
                const existingRatingIds = new Set(
                    Object.values(professor.reviews).flatMap((ratings) =>
                        ratings.map((rating) => rating.id),
                    ),
                );
                const removedRatingIds = [
                    ...new Set(ratingIds.filter((ratingId) => existingRatingIds.has(ratingId))),
                ];
                const removed = await ctx.env.kvDao.removeRatingsBulk(professor, ratingIds);
                await Promise.all(
                    removedRatingIds.map((ratingId) => ctx.env.kvDao.removeReport(ratingId)),
                );
                const auditMessage = buildBulkDeletionAuditMessage(
                    ctx.user!.username,
                    removed,
                    professor.lastName,
                    professor.firstName,
                    professorId,
                    removedRatingIds,
                    reason,
                );
                await ctx.env.notificationDAO.notify("Bulk Rating Deletion", auditMessage);
            }, "Failed to remove ratings in bulk"),
        ),
    getPendingProfessors: protectedProcedure.query(({ ctx }) =>
        ctx.env.kvDao.getAllPendingProfessors(),
    ),
    approvePendingProfessor: protectedProcedure.input(z.uuid()).mutation(
        ensureTRPCError(async ({ ctx, input }) => {
            const pendingProfessor = await ctx.env.kvDao.getPendingProfessor(input);

            await ctx.env.kvDao.putProfessor(pendingProfessor);
            await ctx.env.kvDao.removePendingProfessor(input);
        }, "Failed to approve pending professor"),
    ),
    rejectPendingProfessor: protectedProcedure.input(z.uuid()).mutation(
        ensureTRPCError(async ({ input, ctx }) => {
            await ctx.env.kvDao.removePendingProfessor(input);
        }, "Failed to reject pending professor"),
    ),
    removeProfessor: protectedProcedure.input(z.uuid()).mutation(
        ensureTRPCError(async ({ input, ctx }) => {
            await ctx.env.kvDao.removeProfessor(input);
        }, "Failed to remove professor"),
    ),

    // Takes reviews of target professor and applies them to dest and then removes the target professor
    mergeProfessor: protectedProcedure
        .input(z.object({ destId: z.uuid(), sourceId: z.uuid() }))
        .mutation(
            ensureTRPCError(async ({ ctx, input: { destId, sourceId } }) => {
                const destProfessor = await ctx.env.kvDao.getProfessor(destId);
                const sourceProfessor = await ctx.env.kvDao.getProfessor(sourceId);

                Object.entries(sourceProfessor.reviews).forEach(([course, ratings]) => {
                    ratings.forEach((rating) => addRating(destProfessor, rating, course));
                });

                await ctx.env.kvDao.putProfessor(destProfessor);
                await ctx.env.kvDao.removeProfessor(sourceProfessor.id);
            }, "Failed to merge professor"),
        ),
    changeProfessorDepartment: protectedProcedure.input(changeDepartmentParser).mutation(
        ensureTRPCError(async ({ ctx, input: { professorId, department } }) => {
            const professor = await ctx.env.kvDao.getProfessor(professorId);
            professor.department = department;
            await ctx.env.kvDao.putProfessor(professor);
        }, "Failed to change professor department"),
    ),
    changePendingProfessorDepartment: protectedProcedure.input(changeDepartmentParser).mutation(
        ensureTRPCError(async ({ ctx, input: { professorId, department } }) => {
            const professor = await ctx.env.kvDao.getPendingProfessor(professorId);
            professor.department = department;
            await ctx.env.kvDao.putPendingProfessor(professor);
        }, "Failed to change pending professor department"),
    ),
    changeProfessorName: protectedProcedure.input(changeNameParser).mutation(
        ensureTRPCError(async ({ ctx, input: { professorId, firstName, lastName } }) => {
            const professor = await ctx.env.kvDao.getProfessor(professorId);
            professor.firstName = firstName;
            professor.lastName = lastName;
            await ctx.env.kvDao.putProfessor(professor, true);
        }, "Failed to change professor name"),
    ),
    changePendingProfessorName: protectedProcedure.input(changeNameParser).mutation(
        ensureTRPCError(async ({ ctx, input: { professorId, firstName, lastName } }) => {
            const professor = await ctx.env.kvDao.getPendingProfessor(professorId);
            professor.firstName = firstName;
            professor.lastName = lastName;
            await ctx.env.kvDao.putPendingProfessor(professor);
        }, "Failed to change pending professor name"),
    ),
    lockProfessor: protectedProcedure.input(lockProfessorParser).mutation(
        ensureTRPCError(async ({ ctx, input: { professorId, locked, lockedMessage } }) => {
            const professor = await ctx.env.kvDao.getProfessor(professorId);
            professor.locked = locked;
            professor.lockedMessage = locked ? lockedMessage : undefined;
            await ctx.env.kvDao.putProfessor(professor);
        }, "Failed to update professor lock status"),
    ),
    getBulkKeys: protectedProcedure
        .input(z.enum(bulkKeys))
        .query(({ input, ctx }) => ctx.env.kvDao.getBulkKeys(input)),
    // Mark as mutation to not have url issues
    getBulkValues: protectedProcedure
        .input(z.object({ bulkKey: z.enum(bulkKeys), keys: z.string().array() }))
        .mutation(
            ensureTRPCError(
                ({ ctx, input: { bulkKey, keys } }) => ctx.env.kvDao.getBulkValues(bulkKey, keys),
                "Failed to get bulk values",
            ),
        ),
    removeReport: protectedProcedure.input(z.uuid()).mutation(
        ensureTRPCError(async ({ ctx, input }) => {
            await ctx.env.kvDao.removeReport(input);
        }, "Failed to remove report"),
    ),
    actOnReport: protectedProcedure.input(z.uuid()).mutation(
        ensureTRPCError(async ({ ctx, input }) => {
            const report = await ctx.env.kvDao.getReport(input);
            await ctx.env.kvDao.removeRating(report.professorId, report.ratingId);
            await ctx.env.kvDao.removeReport(input);
        }, "Failed to act on report"),
    ),
    fixEscapedChars: protectedProcedure.input(fixEscapedCharsParser).mutation(
        ensureTRPCError(async ({ ctx, input }) => {
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
        }, "Failed to fix escaped characters"),
    ),
});
