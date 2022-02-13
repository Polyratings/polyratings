import { Env } from '@polyratings/backend/bindings';
import { DtoBypass } from '@polyratings/backend/dtos/DtoBypass';
import { AuthenticatedWithBody } from '@polyratings/backend/middlewares/auth-middleware';
import { LoginRequest } from '@polyratings/shared';
import { Context } from 'sunder';

export class AdminHandler {
    // TODO: Replace with real method
    static removeRating(
        ctx: Context<Env, unknown, AuthenticatedWithBody<LoginRequest>>,
    ) {
        console.log(ctx.data);
    }

    static async pendingProfessors(ctx: Context<Env, unknown, AuthenticatedWithBody<unknown>>,) {
        const pendingProfessors = await ctx.env.kvDao.getAllPendingProfessors()
        ctx.response.body = new DtoBypass(pendingProfessors)
    }

    static async approvePendingTeacher(ctx: Context<Env, { id: string }>) {
        const { id } = ctx.params
        const pendingProfessor = await ctx.env.kvDao.getPendingProfessor(id)

        await ctx.env.kvDao.putProfessor(pendingProfessor)
        await ctx.env.kvDao.removePendingProfessor(id)
    }

    static async rejectPendingTeacher(ctx: Context<Env, { id: string }>) {
        const { id } = ctx.params
        await ctx.env.kvDao.removePendingProfessor(id)
    }

    static async removeProfessor(ctx: Context<Env, { id: string }>) {
        const { id } = ctx.params
        await ctx.env.kvDao.removeProfessor(id)
    }
}
