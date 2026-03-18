import { t, protectedProcedure } from "@backend/trpc";
import { z } from "zod";
import { addRating } from "@backend/types/schemaHelpers";
import { bulkKeys, DEPARTMENT_LIST } from "@backend/utils/const";
import { TRPCError } from "@trpc/server";
import { Professor, RatingReport } from "@backend/types/schema";

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

function getProfessorRatingIds(professor: Professor): Set<string> {
    return new Set(
        Object.values(professor.reviews).flatMap((ratings) => ratings.map((rating) => rating.id)),
    );
}

async function requireProfessor(
    ctx: { env: { kvDao: { getProfessorOptional(id: string): Promise<Professor | undefined> } } },
    professorId: string,
): Promise<Professor> {
    const professor = await ctx.env.kvDao.getProfessorOptional(professorId);
    if (!professor) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: `Professor with id ${professorId} does not exist.`,
        });
    }
    return professor;
}

async function requirePendingProfessor(
    ctx: {
        env: {
            kvDao: { getPendingProfessorOptional(id: string): Promise<Professor | undefined> };
        };
    },
    professorId: string,
): Promise<Professor> {
    const professor = await ctx.env.kvDao.getPendingProfessorOptional(professorId);
    if (!professor) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: `Pending professor with id ${professorId} does not exist.`,
        });
    }
    return professor;
}

async function requireReport(
    ctx: { env: { kvDao: { getReportOptional(id: string): Promise<RatingReport | undefined> } } },
    reportId: string,
): Promise<RatingReport> {
    const report = await ctx.env.kvDao.getReportOptional(reportId);
    if (!report) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: `Report for rating id ${reportId} does not exist.`,
        });
    }
    return report;
}

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
        .input(z.object({ professorId: z.uuid(), ratingId: z.uuid() }))
        .mutation(async ({ ctx, input: { professorId, ratingId } }) => {
            const professor = await requireProfessor(ctx, professorId);
            if (!getProfessorRatingIds(professor).has(ratingId)) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `Rating with id ${ratingId} does not exist on professor ${professorId}.`,
                });
            }
            await ctx.env.kvDao.removeRating(professorId, ratingId);
            await ctx.env.kvDao.removeReport(ratingId);
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
            await ctx.env.kvDao.putProfessor(professor, true);
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
    removeReport: protectedProcedure.input(z.uuid()).mutation(async ({ ctx, input }) => {
        await ctx.env.kvDao.removeReport(input);
    }),
    actOnReport: protectedProcedure.input(z.uuid()).mutation(async ({ ctx, input }) => {
        const report = await requireReport(ctx, input);
        const professor = await requireProfessor(ctx, report.professorId);
        if (!getProfessorRatingIds(professor).has(report.ratingId)) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `Rating with id ${report.ratingId} does not exist on professor ${report.professorId}.`,
            });
        }
        await ctx.env.kvDao.removeRating(report.professorId, report.ratingId);
        await ctx.env.kvDao.removeReport(input);
    }),
    fixEscapedChars: protectedProcedure
        .input(fixEscapedCharsParser)
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

            for (const profId of input.professors) {
                // eslint-disable-next-line no-await-in-loop
                const professor = await requireProfessor(ctx, profId);
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
});
