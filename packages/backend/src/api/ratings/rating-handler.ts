import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { AddReviewRequest, AddReviewResponse, ProcessingReviewResponse } from '@polyratings/shared';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { PendingReviewDTO } from '@polyratings/backend/dtos/Reviews';
import { KVDAO } from '@polyratings/backend/api/dao/kv-dao';
import { PerspectiveDAO } from '@polyratings/backend/api/dao/perspective-dao';

export class RatingHandler {

    static async addNewRating(ctx: Context<Env, { id: string }, AddReviewRequest>) {
        if (ctx.params.id !== ctx.data.professor) {
            throw new PolyratingsError(400, {
                message: "Failed validation on Professor ID"
            });
        }

        const kv = new KVDAO(ctx);
        const pendingReview = PendingReviewDTO.fromAddReviewRequest(ctx.data);

        await kv.addPendingReview(pendingReview);

        ctx.response.status = 202;
        ctx.response.body = new AddReviewResponse(
            true,
            // TODO: Replace with runtime url
            `Queued new rating, please call GET https://sunder.polyratings.dev/ratings/${pendingReview.id} to begin processing.`,
            pendingReview.id
        );
    }

    static async processRating(ctx: Context<Env, { id: string }>) {
        const kv = new KVDAO(ctx);

        const pendingRating = await kv.getPendingReview(ctx.params.id);

        if (pendingRating.status !== 'Queued') {
            throw new PolyratingsError(405, "Cannot perform operation on pending rating in terminal state!");
        }

        const analyzer = new PerspectiveDAO(ctx);

        console.info("Calling analyzeReview on the DAO");
        const analysisResponse = await analyzer.analyzeReview(pendingRating);
        console.info("Finished call to analyzeReview on the DAO");
        pendingRating.sentimentResponse = analysisResponse.attributeScores;

        const scores = [
            analysisResponse.attributeScores.SEVERE_TOXICITY?.summaryScore.value!,
            analysisResponse.attributeScores.IDENTITY_ATTACK?.summaryScore.value!,
            analysisResponse.attributeScores.THREAT?.summaryScore.value!,
            analysisResponse.attributeScores.SEXUALLY_EXPLICIT?.summaryScore.value!,
        ];

        const responseBody = new ProcessingReviewResponse();

        if (scores.filter(num => num > .8).length != 0) {
            pendingRating.status = 'Failed';
            responseBody.success = false;
            responseBody.message = 'Review failed sentiment analysis, please contact nobody@example.org for assistance';

            console.log(pendingRating.sentimentResponse);
        } else {
            pendingRating.status = 'Successful';
            responseBody.message = 'Review has successfully been processed, it should be on the site within the next hour.'
            responseBody.success = true;

            await kv.addReview(pendingRating);
            await kv.addPendingReview(pendingRating);
        }

        ctx.response.body = responseBody;
    }
}