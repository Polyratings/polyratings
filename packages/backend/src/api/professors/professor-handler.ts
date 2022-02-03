import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ProfessorDTO } from '@polyratings/backend/dtos/Professors';
import { plainToInstance } from 'class-transformer';
import { DtoBypass } from '@polyratings/backend/dtos/DtoBypass';
import { PolyratingsError } from '@polyratings/backend/utils/errors';

export class ProfessorHandler {
    /**
     * Retrieves the entire list of professors from the KV store
     * @param ctx - sunder routing context
     */
    static async getProfessorList(ctx: Context<Env>) {
        const professorList = await ctx.env.POLYRATINGS.get('all');
        if (professorList === null) {
            throw new PolyratingsError(404, "No professors found!");
        }
        
        // Use dto bypass because the professor list is too large to be used with class-transformer efficiently
        // We also know that the data stored in `all` is safe to send
        ctx.response.body = new DtoBypass(professorList)
    }

    static async getSingleProfessor(ctx: Context<Env, {id: string}>) {
        const professor = await ctx.env.POLYRATINGS.get(ctx.params.id);
        if (professor === null) {
            throw new PolyratingsError(404, "Professor not found!")
        }
        ctx.response.body = plainToInstance(ProfessorDTO, JSON.parse(professor));
    }
}