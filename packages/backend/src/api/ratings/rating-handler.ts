import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { AddReviewRequest, AddReviewResponse } from '@polyratings/shared';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { PendingReviewDTO } from '@polyratings/backend/dtos/Reviews';

export class RatingHandler {

    static async addNewRating(ctx: Context<Env, { id: string }, AddReviewRequest>) {
        if (ctx.params.id !== ctx.data.professor) {
            throw new PolyratingsError(400, {
                message: "Failed validation on Professor ID"
            });
        }

        ctx.response.status = 202;
        ctx.response.statusText = "Queued Rating";

        const response = new AddReviewResponse();
        // TODO: Potentially search for collisions, though that would be computationally expensive
        response.newReviewId = crypto.randomUUID();

        const pendingRating = new PendingReviewDTO(response.newReviewId, ctx.data);

        await ctx.env.PROCESSING_QUEUE.put(pendingRating.id, JSON.stringify(pendingRating));

        response.success = true;
        response.statusMessage = `Queued new rating, please call GET https://sunder.polyratings.dev/ratings/${response.newReviewId} to begin processing.`;

        ctx.response.body = response;
    }
}