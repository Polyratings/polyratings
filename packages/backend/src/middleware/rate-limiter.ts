import { Env } from "@backend/env";
import { t } from "@backend/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Middleware function that checks if the request is limited by rate limiting.
 * Throws an error if the rate limit is exceeded.
 *
 * @param rateLimiterName - The rate limiter to use.
 * @returns A promise that resolves to the result of the next middleware function.
 * @throws TRPCError with code 'TOO_MANY_REQUESTS' if the rate limit is exceeded.
 */
export const getRateLimiter = (rateLimiterName: keyof Env["rateLimiters"]) =>
    t.middleware(async (opts) => {
        const { ctx, path } = opts;

        // Skip rate limiting for authenticated admins
        if (ctx.user) {
            return opts.next();
        }

        const anonId = await ctx.env.anonymousIdDao.getIdentifier();

        // Check if the request is limited by rate limiting (uses anonId and URI)
        const { success } = await ctx.env.rateLimiters[rateLimiterName].limit({
            key: `${path}_${anonId}`,
        });

        if (!success) {
            // Throw an error if the rate limit is exceeded
            throw new TRPCError({
                message: "Rate limit exceeded",
                code: "TOO_MANY_REQUESTS",
            });
        }

        // Otherwise, continue to the next middleware function
        return opts.next();
    });
