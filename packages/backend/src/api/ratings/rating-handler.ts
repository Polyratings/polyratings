import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { AddReviewRequest } from '@polyratings/shared';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { transformAndValidate } from 'class-transformer-validator';
import { ProfessorDTO } from '@polyratings/backend/dtos/Professors';

export class RatingHandler {
    // currently not configured to properly add a pending rating to the
    // processing queue
    static async addNewRating(ctx: Context<Env, { id: string }, AddReviewRequest>) {
        if (ctx.params.id !== ctx.data.professor) {
            throw new PolyratingsError(400, {
                message: "Failed validation on Professor ID"
            });
        }

        ctx.response.status = 200;
        ctx.response.statusText = "Done!";

        /*
        TODO: need to figure out and fix why wrangler specifically does not like this block when trying to publish
        I have a feeling it has something to do with trying to create a concrete instance of one of the DTOs as
        commenting out line 31 appears to solve the issue
         */
        // let professorString = await ctx.env.POLYRATINGS.get(ctx.params.id);
        // if (professorString == null)
        //     throw new PolyratingsError(404, {
        //         message: "Professor does not exist!"
        //     });
        // let professor = await transformAndValidate(ProfessorDTO, professorString);
    }
}