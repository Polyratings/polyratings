import { Context } from "sunder";
import { Env } from "@polyratings/backend/bindings";
import {
    AddReviewRequest,
    AddReviewResponse,
    ProcessingReviewResponse,
    ReportReviewRequest,
    Internal,
} from "@polyratings/shared";
import { PolyratingsError } from "@polyratings/backend/utils/errors";

export class RatingHandler {
    static async addNewRating(ctx: Context<Env, unknown, AddReviewRequest>) {
        const pendingReview = Internal.PendingReviewDTO.fromAddReviewRequest(ctx.data);

        await ctx.env.kvDao.addPendingReview(pendingReview);

        ctx.response.status = 202;
        ctx.response.body = AddReviewResponse.new(
            true,
            // TODO: Replace with runtime url
            `Queued new rating, please call GET https://sunder.polyratings.dev/ratings/${pendingReview.id} to begin processing.`,
            pendingReview.id,
        );
    }

    static async processRating(ctx: Context<Env, { id: string }>) {
        const pendingRating = await ctx.env.kvDao.getPendingReview(ctx.params.id);

        if (pendingRating.status !== "Queued") {
            throw new PolyratingsError(
                405,
                "Cannot perform operation on pending rating in terminal state!",
            );
        }

        const analysisResponse = await ctx.env.perspectiveDao.analyzeReview(pendingRating);
        pendingRating.sentimentResponse = analysisResponse.attributeScores;

        const passedAnalysis = [
            analysisResponse.attributeScores.SEVERE_TOXICITY?.summaryScore.value,
            analysisResponse.attributeScores.IDENTITY_ATTACK?.summaryScore?.value,
            analysisResponse.attributeScores.THREAT?.summaryScore?.value,
            analysisResponse.attributeScores.SEXUALLY_EXPLICIT?.summaryScore?.value,
        ].reduce((acc, num) => {
            if (num === undefined) {
                throw new Error("Not all of perspective summery scores were received");
            }
            return num < 0.8 && acc;
        }, true);

        if (passedAnalysis) {
            pendingRating.status = "Successful";
            const updatedTeacher = await ctx.env.kvDao.addReview(pendingRating);
            // Update review in processing queue
            await ctx.env.kvDao.addPendingReview(pendingRating);

            ctx.response.body = ProcessingReviewResponse.new(
                true,
                "Review has successfully been processed, it should be on the site within the next minute.",
                updatedTeacher,
            );
        } else {
            pendingRating.status = "Failed";
            // Update review in processing queue
            await ctx.env.kvDao.addPendingReview(pendingRating);
            ctx.response.body = ProcessingReviewResponse.new(
                false,
                "Review failed sentiment analysis, please contact dev@polyratings.dev for assistance",
            );
        }
    }

    static async reportRating(ctx: Context<Env, unknown, ReportReviewRequest>) {
        const reportReviewRequest = ctx.data;
        const report = Internal.RatingReport.fromReportReviewRequest(reportReviewRequest);
        await ctx.env.kvDao.putReport(report);
        await ctx.env.notificationDAO.sendWebhook(
            "Received A Report",
            `Rating ID: ${report.ratingId}\n` +
                `Professor ID: ${report.professorId}\n` +
                `Reason: ${reportReviewRequest.reason}`,
        );
    }
}
