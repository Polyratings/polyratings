import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { AddReviewRequest } from '@polyratings/shared';

export class RatingHandler {
    // currently not configured to properly add a pending rating to the
    // processing queue
    static async addNewRating(ctx: Context<Env, { id: string }, AddReviewRequest>) {
        if (ctx.params.id !== ctx.data.professorId) {
            console.log(`param id: ${ctx.params.id}\nrequest id: ${ctx.data.professorId}`);
            console.log()
            ctx.response.status = 400;
            ctx.response.statusText = "IDs do not match!";
        } else {
            ctx.response.status = 200;
            ctx.response.body = { newReviewId: crypto.randomUUID() };
        }
    }
}