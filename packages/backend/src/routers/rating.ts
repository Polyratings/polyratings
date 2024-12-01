import { t } from "@backend/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PendingRating, ratingBaseParser, RatingReport, reportParser } from "@backend/types/schema";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { getRateLimiter } from "@backend/middleware/rate-limiter";

export const ratingsRouter = t.router({
    add: t.procedure
        .use(getRateLimiter("ADD_RATING_LIMITER"))
        .input(
            ratingBaseParser.merge(
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
                status: "Failed",
                error: null,
                analyzedScores: null,
                anonymousIdentifier: await ctx.env.anonymousIdDao.getIdentifier(),
            };

            // Abuse protection: Check if the same rating text has already been submitted for the same professor
            const professor = await ctx.env.kvDao.getProfessor(input.professor);

            const existingRating = Object.values(professor.reviews)
                .flat()
                .find(
                    (rating) =>
                        rating.rating === pendingRating.rating &&
                        rating.anonymousIdentifier === pendingRating.anonymousIdentifier,
                );

            if (existingRating) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message:
                        "This review has already been submitted, please contact dev@polyratings.org for assistance",
                });
            }

            // Run sentiment analysis on rating
            const analyzedScores = await ctx.env.ratingAnalyzer.analyzeRating(pendingRating);
            pendingRating.analyzedScores = analyzedScores;

            // At least 50% of people would find the text offensive in category
            const PERSPECTIVE_THRESHOLD = 0.5;

            const passedAnalysis = Object.values(analyzedScores).reduce((acc, num) => {
                if (num === undefined) {
                    throw new Error("Not all of perspective summery scores were received");
                }
                return num < PERSPECTIVE_THRESHOLD && acc;
            }, true);

            if (!passedAnalysis) {
                // Update rating in processing queue
                pendingRating.status = "Failed";
                await ctx.env.kvDao.addRatingLog(pendingRating);

                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message:
                        "Rating failed sentiment analysis, please contact dev@polyratings.org for assistance",
                });
            }

            // Update rating in processing queue
            pendingRating.status = "Successful";

            const updatedProfessor = await ctx.env.kvDao.addRating(pendingRating);

            await ctx.env.kvDao.addRatingLog(pendingRating);

            return updatedProfessor;
        }),
    report: t.procedure
        .input(
            reportParser.merge(
                z.object({ ratingId: z.string().uuid(), professorId: z.string().uuid() }),
            ),
        )
        .mutation(async ({ ctx, input }) => {
            const anonymousIdentifier = await ctx.env.anonymousIdDao.getIdentifier();
            const ratingReport: RatingReport = {
                ratingId: input.ratingId,
                professorId: input.professorId,
                reports: [
                    {
                        email: input.email,
                        reason: input.reason,
                        anonymousIdentifier,
                    },
                ],
            };

            await ctx.env.kvDao.putReport(ratingReport);

            // Get the rating in question
            const professor = await ctx.env.kvDao.getProfessor(ratingReport.professorId);
            const rating = Object.values(professor.reviews)
                .flat()
                .find((rating) => rating.id === ratingReport.ratingId);

            await ctx.env.notificationDAO.notify(
                "Received A Report",
                `Rating ID: ${ratingReport.ratingId}\n` +
                    `Submitter: ${ratingReport.reports[0].anonymousIdentifier}` +
                    `Professor ID: ${ratingReport.professorId}\n` +
                    `Reason: ${ratingReport.reports[0].reason}\n` +
                    `Rating: ${rating?.rating ?? "ERROR-RATING-NOT-FOUND"}`,
            );
        }),
});
