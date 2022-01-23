import { AddReviewRequest } from '../../../../shared';
import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';

export class RatingHandler {
    // currently not configured to properly add a pending rating to the
    // processing queue
    static async addNewRating(ctx: Context<Env, { id: string }, AddReviewRequest>) {
        console.log("We entered add new rating!");
        if (ctx.params.id !== ctx.data.professor) {
            console.log(`param id: ${ctx.params.id}\nrequest id: ${ctx.data.professor}`);
            console.log()
            ctx.response.status = 400;
            ctx.response.statusText = "IDs do not match!";
        } else {
            ctx.response.status = 200;
            ctx.response.statusText = "IDs match!!";
        }
    }
}