import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ProfessorListDTO, TruncatedProfessorDTO } from '@polyratings/backend/dtos/Professors';

export class ProfessorHandler {
    /**
     * Retrieves the entire list of professors from the KV store
     * @param ctx - sunder routing context
     */
    static async getProfessorList(ctx: Context<Env>) {
        let professorList = await ctx.env.POLYRATINGS.get('all');
        if (professorList === null) {
            ctx.throw(404, "No professors found!");
        } else {
            const coercedList = professorList as unknown as TruncatedProfessorDTO[];
            ctx.response.body = { professors: coercedList } as ProfessorListDTO;
        }
    }

    static async getSingleProfessor(ctx: Context<Env, {id: string}>) {
        const professor = await ctx.env.POLYRATINGS.get(ctx.params.id);
        console.log(professor);
        if (professor === null) {
            ctx.throw(404, "Professor not found!");
        }
        ctx.response.body = professor;
    }
}