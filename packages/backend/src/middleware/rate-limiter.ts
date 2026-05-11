import { publicProcedure, t } from "@backend/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Enforces `env.rateLimiter` with key `${tRPC path}_${anonId}` (per procedure, per anonymous client).
 * Skips when `ctx.user` is set (admin JWT).
 *
 * @throws TRPCError with code 'TOO_MANY_REQUESTS' if the rate limit is exceeded.
 */
export const rateLimitMiddleware = t.middleware(async (opts) => {
    const { ctx, path } = opts;

    if (ctx.user) {
        return opts.next();
    }

    const anonId = await ctx.env.anonymousIdDao.getIdentifier();

    const { success } = await ctx.env.rateLimiter.limit({
        key: `${path}_${anonId}`,
    });

    if (!success) {
        throw new TRPCError({
            message: "Rate limit exceeded",
            code: "TOO_MANY_REQUESTS",
        });
    }

    return opts.next();
});

/** Public procedure with anonymous rate limiting applied (see `rateLimitMiddleware`). */
export const rateLimitedPublicProcedure = publicProcedure.use(rateLimitMiddleware);
