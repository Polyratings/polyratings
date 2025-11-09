import { t } from '@backend/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { PendingRating, ratingBaseParser, RatingReport, reportParser } from '@backend/types/schema';
import { DEPARTMENT_LIST } from '@backend/utils/const';
import { Env } from '@backend/env';

const addRatingParser = ratingBaseParser.extend({
    professor: z.uuid(),
    department: z.enum(DEPARTMENT_LIST),
    courseNum: z.number().min(100).max(599),
});

// The MAX_HARASSMENT threshold (0.65) was empirically chosen to balance false positives and false negatives
// in content moderation. Ratings with a harassment score above this value are flagged for review.
// Lower values increase sensitivity (more false positives), while higher values may miss harmful content.
const MAX_HARASSMENT = 0.65;

export async function addRating(input: z.infer<typeof addRatingParser>, ctx: { env: Env }) {
    // Input is a string subset of PendingRating
    const pendingRating: PendingRating = {
        id: crypto.randomUUID(),
        ...input,
        postDate: new Date().toString(),
        status: 'Failed',
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
            code: 'PRECONDITION_FAILED',
            message:
                'This review has already been submitted, please contact dev@polyratings.org for assistance',
        });
    }

    const analysis = await ctx.env.ratingAnalyzer.analyzeRating(pendingRating);

    if (analysis) {
        pendingRating.analyzedScores = analysis.category_scores;
        if (analysis.flagged) {
            // Strongly negative reviews that aren't necessarily character attacks seem to get flagged too easily
            if (
                analysis.categories.harassment &&
                analysis.category_scores.harassment >= MAX_HARASSMENT
            ) {
                // Update rating in processing queue
                pendingRating.status = 'Failed';
                await ctx.env.kvDao.addRatingLog(pendingRating);

                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message:
                        "Sorry, we couldn't accept this review as written. Please keep ratings constructive and respectful.",
                });
            }
        }
    }

    // Update rating in processing queue
    pendingRating.status = 'Successful';

    const updatedProfessor = await ctx.env.kvDao.addRating(pendingRating);

    await ctx.env.kvDao.addRatingLog(pendingRating);

    return updatedProfessor;
}

export const ratingsRouter = t.router({
    add: t.procedure
        .input(addRatingParser)
        .mutation(async ({ ctx, input }) => addRating(input, ctx)),
    report: t.procedure
        .input(reportParser.extend({ ratingId: z.uuid(), professorId: z.uuid() }))
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
                'Received A Report',
                `Rating ID: ${ratingReport.ratingId}\n` +
                    `Submitter: ${ratingReport.reports[0].anonymousIdentifier}` +
                    `Professor ID: ${ratingReport.professorId}\n` +
                    `Reason: ${ratingReport.reports[0].reason}\n` +
                    `Rating: ${rating?.rating ?? 'ERROR-RATING-NOT-FOUND'}`,
            );
        }),
});
