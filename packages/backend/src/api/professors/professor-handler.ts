import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';

export class ProfessorHandler {
    /**
     * Retrieves the entire list of professors from the KV store
     * @param ctx - sunder routing context
     */
    static async getProfessorList(ctx: Context<Env>) {
        const professorList = await ctx.env.POLYRATINGS.get('all');
        if (professorList === null) {
            ctx.throw(404, "No professors found!");
        } else {
            ctx.response.body = professorList;
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