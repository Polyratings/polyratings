import { Env } from "@polyratings/backend/bindings";
import { DtoBypass } from "@polyratings/backend/dtos/DtoBypass";
import { AuthenticatedWithBody } from "@polyratings/backend/middlewares/auth-middleware";
import { ProfessorKeyList } from "@polyratings/shared";
import { Context } from "sunder";

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

    static async getProfessorKeys(ctx: Context<Env, unknown, AuthenticatedWithBody<unknown>>) {
        const professorKeys = await ctx.env.kvDao.getProfessorKeys();
        ctx.response.body = new DtoBypass(professorKeys);
    }

    static async getProfessorValues(
        ctx: Context<Env, unknown, AuthenticatedWithBody<ProfessorKeyList>>,
    ) {
        const { professorKeys } = ctx.data.body;
        const values = await Promise.all(
            professorKeys.map((key) => ctx.env.kvDao.getProfessorUnchecked(key)),
        );
        ctx.response.body = new DtoBypass(values);
    }
}
