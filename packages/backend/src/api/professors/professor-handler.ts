import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { DtoBypass } from '@polyratings/backend/dtos/DtoBypass';
import { AddProfessorRequest } from '@polyratings/shared';
import { ProfessorDTO } from '@polyratings/backend/dtos/Professors';

export class ProfessorHandler {
    /**
     * Retrieves the entire list of professors from the KV store
     */
    static async getProfessorList(ctx: Context<Env>) {
        ctx.response.body = new DtoBypass(await ctx.env.kvDao.getAllProfessors());
    }

    /**
     * Retrieves a single professor from the KV store
     */
    static async getSingleProfessor(ctx: Context<Env, { id: string }>) {
        ctx.response.body = await ctx.env.kvDao.getProfessor(ctx.params.id);
    }

    /**
     * Adds a professor to the pending professor list to be manually approved
     */
    static async addNewProfessor(ctx: Context<Env, unknown, AddProfessorRequest>) {
        const { data: addProfessorRequest } = ctx;
        const professor = ProfessorDTO.fromAddProfessorRequest(addProfessorRequest);

        const existingPendingProfessors = await ctx.env.kvDao.getAllPendingProfessors();
        const duplicateProfessor = existingPendingProfessors.find(
            (prof) => prof.firstName == professor.firstName && prof.lastName == prof.lastName,
        );

        if (duplicateProfessor) {
            const [[courseName, reviews]] = Object.entries(professor.reviews);
            duplicateProfessor.addReview(reviews[0], courseName);
            await ctx.env.kvDao.putPendingProfessor(duplicateProfessor);
        } else {
            await ctx.env.kvDao.putPendingProfessor(professor);
        }

        ctx.response.status = 202;
        ctx.response.statusText =
            'The request for the new professor has been accepted and is pending manual approval';
    }
}
