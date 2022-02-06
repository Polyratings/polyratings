import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { DtoBypass } from '@polyratings/backend/dtos/DtoBypass';
import { KVDAO } from '@polyratings/backend/api/dao/kv-dao';

export class ProfessorHandler {
    /**
     * Retrieves the entire list of professors from the KV store
     */
    static async getProfessorList(ctx: Context<Env>) {
        const kv = new KVDAO(ctx);

        ctx.response.body = new DtoBypass(await kv.getAllProfessors());
    }

    /**
     * Retrieves a single professor from the KV store
     */
    static async getSingleProfessor(ctx: Context<Env, {id: string}>) {
        const kv = new KVDAO(ctx);

        ctx.response.body = await kv.getProfessor(ctx.params.id);
    }
}