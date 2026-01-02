import { t } from "@backend/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PendingRating, ratingBaseParser, RatingReport, reportParser } from "@backend/types/schema";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { Env } from "@backend/env";
import { getRateLimiter } from "@backend/middleware/rate-limiter";
import { ensureTRPCError } from "@backend/middleware/ensure-trpc-error";
import { checkModerationThresholds } from "@backend/utils/moderation";

const addRatingParser = ratingBaseParser.extend({
    professor: z.uuid(),
    department: z.enum(DEPARTMENT_LIST),
    courseNum: z.number().min(100).max(599),
});

export async function addRating(input: z.infer<typeof addRatingParser>, ctx: { env: Env }) {
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
        .find((rating) => rating.rating.trim() === pendingRating.rating);

    if (existingRating) {
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
                "This review has already been submitted, please contact dev@polyratings.org for assistance",
        });
    }

    const analysis = await ctx.env.ratingAnalyzer.analyzeRating(pendingRating);

    if (analysis) {
        pendingRating.analyzedScores = analysis.category_scores;

        // Check all configured moderation thresholds
        const violation = checkModerationThresholds(analysis.category_scores);

        if (violation) {
            // Store detailed violation reason for admin/debugging (not shown to user)
            pendingRating.status = "Failed";
            pendingRating.error = violation.reason;
            await ctx.env.kvDao.addRatingLog(pendingRating);

            throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message:
                    "Sorry, we couldn't accept this review as written. Please keep ratings constructive and respectful.",
            });
        }
    }

    // Update rating in processing queue
    pendingRating.status = "Successful";

    const updatedProfessor = await ctx.env.kvDao.addRating(pendingRating);

    await ctx.env.kvDao.addRatingLog(pendingRating);

    return updatedProfessor;
}

export const ratingsRouter = t.router({
    add: t.procedure
        .use(getRateLimiter("addRating"))
        .input(addRatingParser)
        .mutation(
            ensureTRPCError(({ ctx, input }) => addRating(input, ctx), "Failed to add rating"),
        ),
    report: t.procedure
        .input(reportParser.extend({ ratingId: z.uuid(), professorId: z.uuid() }))
        .mutation(
            ensureTRPCError(async ({ ctx, input }) => {
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
            }, "Failed to submit report"),
        ),
});
