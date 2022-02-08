import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { DtoBypass } from '@polyratings/backend/dtos/DtoBypass';

export class ProfessorHandler {
    /**
     * Retrieves the entire list of professors from the KV store
     */
    static async getProfessorList(ctx: Context<Env>) {
        ctx.response.body = new DtoBypass(
            await ctx.env.kvDao.getAllProfessors(),
        );
    }

    /**
     * Retrieves a single professor from the KV store
     */
    static async getSingleProfessor(ctx: Context<Env, { id: string }>) {
        ctx.response.body = await ctx.env.kvDao.getProfessor(ctx.params.id);
    }
}
