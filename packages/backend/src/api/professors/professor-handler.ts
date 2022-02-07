import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { DtoBypass } from '@polyratings/backend/dtos/DtoBypass';
import { Teacher } from '@polyratings/shared';
import { TruncatedProfessorDTO } from '@polyratings/backend/dtos/Professors';
import { transformAndValidate } from '@polyratings/backend/utils/transform-and-validate';

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

    // TODO: Remove this method eventually, purely for testing
    static async getSingleTruncatedProf(ctx: Context<Env, { id: string }>) {
        const profList = await ctx.env.kvDao.getAllProfessors();

        const list = JSON.parse(profList) as Teacher[];

        const prof = await transformAndValidate(
            TruncatedProfessorDTO,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            list.find((t) => t.id == ctx.params.id)!,
        );

        ctx.response.body = prof;
    }
}
