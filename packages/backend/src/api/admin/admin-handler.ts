import { Env } from "@polyratings/backend/bindings";
import { AuthenticatedWithBody } from "@polyratings/backend/middlewares/auth-middleware";
import {
    BulkKey,
    BulkValueRequest,
    ChangeDepartmentRequest,
    ChangeNameRequest,
    MergeProfessorRequest,
} from "@polyratings/shared";
import { Context } from "sunder";
import { DtoBypass } from "@polyratings/backend/utils/DtoBypass";

export class AdminHandler {
    // Limitation of sunder path param. Can not resolve both variables
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async removeRating(ctx: Context<Env, any, AuthenticatedWithBody<unknown>>) {
        const { professorId, reviewId } = ctx.params;
        await ctx.env.kvDao.removeReview(professorId, reviewId);
    }

    static async pendingProfessors(ctx: Context<Env, unknown, AuthenticatedWithBody<unknown>>) {
        const pendingProfessors = await ctx.env.kvDao.getAllPendingProfessors();
        ctx.response.body = new DtoBypass(pendingProfessors);
    }

    static async approvePendingTeacher(ctx: Context<Env, { id: string }>) {
        const { id } = ctx.params;
        const pendingProfessor = await ctx.env.kvDao.getPendingProfessor(id);

        await ctx.env.kvDao.putProfessor(pendingProfessor);
        await ctx.env.kvDao.removePendingProfessor(id);
    }

    static async rejectPendingTeacher(ctx: Context<Env, { id: string }>) {
        const { id } = ctx.params;
        await ctx.env.kvDao.removePendingProfessor(id);
    }

    static async removeProfessor(ctx: Context<Env, { id: string }>) {
        const { id } = ctx.params;
        await ctx.env.kvDao.removeProfessor(id);
    }

    /**
     * Takes reviews of target professor and applies them to dest and then removes the target professor
     */
    static async mergeProfessor(
        ctx: Context<Env, unknown, AuthenticatedWithBody<MergeProfessorRequest>>,
    ) {
        const { destId, sourceId } = ctx.data.body;
        const destProfessor = await ctx.env.kvDao.getProfessor(destId);
        const sourceProfessor = await ctx.env.kvDao.getProfessor(sourceId);

        Object.entries(sourceProfessor.reviews).forEach(([course, reviews]) => {
            reviews.forEach((review) => destProfessor.addReview(review, course));
        });

        await ctx.env.kvDao.putProfessor(destProfessor);
        await ctx.env.kvDao.removeProfessor(sourceProfessor.id);
    }

    /**
     * Changes a professors department
     */
    static async changeDepartment(
        ctx: Context<Env, unknown, AuthenticatedWithBody<ChangeDepartmentRequest>>,
    ) {
        const { professorId, department } = ctx.data.body;
        const professor = await ctx.env.kvDao.getProfessor(professorId);
        professor.department = department;
        await ctx.env.kvDao.putProfessor(professor);
    }

    /**
     * Changes a professors name
     */
    static async changeName(ctx: Context<Env, unknown, AuthenticatedWithBody<ChangeNameRequest>>) {
        const { professorId, firstName, lastName } = ctx.data.body;
        const professor = await ctx.env.kvDao.getProfessor(professorId);
        professor.firstName = firstName;
        professor.lastName = lastName;
        await ctx.env.kvDao.putProfessor(professor, true);
    }

    static async getBulkKeys(ctx: Context<Env, { key: string }, AuthenticatedWithBody<unknown>>) {
        const bulkKey = ctx.params.key;
        const professorKeys = await ctx.env.kvDao.getBulkKeys(bulkKey as BulkKey);
        ctx.response.body = new DtoBypass(professorKeys);
    }

    static async getBulkValues(
        ctx: Context<Env, { key: string }, AuthenticatedWithBody<BulkValueRequest>>,
    ) {
        const bulkKey = ctx.params.key;
        const kvKeys = ctx.data.body.keys;
        const values = await ctx.env.kvDao.getBulkValues(bulkKey as BulkKey, kvKeys);
        ctx.response.body = new DtoBypass(values);
    }

    static async removeReport(ctx: Context<Env, { id: string }, AuthenticatedWithBody<unknown>>) {
        const { id } = ctx.params;
        await ctx.env.kvDao.removeReport(id);
    }

    static async actOnReport(ctx: Context<Env, { id: string }, AuthenticatedWithBody<unknown>>) {
        const { id } = ctx.params;
        const report = await ctx.env.kvDao.getReport(id);
        await ctx.env.kvDao.removeReview(report.professorId, report.ratingId);
        await ctx.env.kvDao.removeReport(id);
    }
}
