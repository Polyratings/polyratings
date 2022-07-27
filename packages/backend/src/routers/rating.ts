import { t } from "@backend/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
    PendingRating,
    ratingBaseValidator,
    RatingReport,
    reportValidator,
} from "@backend/types/schema";
import { DEPARTMENT_LIST } from "@backend/utils/const";

export const ratingsRouter = t.router({
    addNewRating: t.procedure
        .input(
            ratingBaseValidator.merge(
                z.object({
                    professor: z.string().uuid(),
                    department: z.enum(DEPARTMENT_LIST),
                    courseNum: z.number().min(100).max(599),
                }),
            ),
        )
        .mutation(async ({ ctx, input }) => {
            // Input is a string subset of PendingRating
            const pendingRating: PendingRating = {
                id: crypto.randomUUID(),
                ...input,
                postDate: new Date().toString(),
                status: "Queued",
                error: null,
                sentimentResponse: null,
            };

            await ctx.env.kvDao.addPendingReview(pendingRating);

            return pendingRating.id;
        }),
    processRating: t.procedure.input(z.string().uuid()).mutation(async ({ ctx, input }) => {
        const pendingRating = await ctx.env.kvDao.getPendingReview(input);

        if (pendingRating.status !== "Queued") {
            throw new TRPCError({
                code: "CONFLICT",
                message: "Cannot perform operation on pending rating in terminal state!",
            });
        }

        const attributeScores = await ctx.env.perspectiveDao.analyzeReview(pendingRating);
        pendingRating.sentimentResponse = attributeScores;

        const passedAnalysis = [
            attributeScores.SEVERE_TOXICITY?.summaryScore.value,
            attributeScores.IDENTITY_ATTACK?.summaryScore?.value,
            attributeScores.THREAT?.summaryScore?.value,
            attributeScores.SEXUALLY_EXPLICIT?.summaryScore?.value,
        ].reduce((acc, num) => {
            if (num === undefined) {
                throw new Error("Not all of perspective summery scores were received");
            }
            return num < 0.8 && acc;
        }, true);

        if (passedAnalysis) {
            pendingRating.status = "Successful";
            await ctx.env.kvDao.addReview(pendingRating);
            // Update review in processing queue
            await ctx.env.kvDao.addPendingReview(pendingRating);

            return "Review has successfully been processed, it should be on the site within the next minute.";
        }
        pendingRating.status = "Failed";
        // Update review in processing queue
        await ctx.env.kvDao.addPendingReview(pendingRating);
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
                "Review failed sentiment analysis, please contact dev@polyratings.org for assistance",
        });
    }),
    reportRating: t.procedure
        .input(
            reportValidator.merge(
                z.object({ ratingId: z.string().uuid(), professorId: z.string().uuid() }),
            ),
        )
        .mutation(async ({ ctx, input }) => {
            const ratingReport: RatingReport = {
                ratingId: input.ratingId,
                professorId: input.professorId,
                reports: [
                    {
                        email: input.email,
                        reason: input.reason,
                    },
                ],
            };

            await ctx.env.kvDao.putReport(ratingReport);
            await ctx.env.notificationDAO.sendWebhook(
                "Received A Report",
                `Rating ID: ${ratingReport.ratingId}\n` +
                    `Professor ID: ${ratingReport.professorId}\n` +
                    `Reason: ${ratingReport.reports[0].reason}`,
            );
        }),
});
