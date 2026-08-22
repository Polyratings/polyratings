import { initTRPC, TRPCError } from "@trpc/server";
import { Env } from "./env";

export type Context = {
    env: Env;
    user?: {
        username: string;
    };
};

export const t = initTRPC.context<Context>().create({});

const normalizeUnknownErrors = t.middleware(async ({ next, path, type }) => {
    try {
        return await next();
    } catch (error) {
        if (error instanceof TRPCError) {
            throw error;
        }
        // Log path/type and a short summary only — the raw throw can include
        // rating text or SDK payloads. Attach the original error as `cause`
        // so Sentry still sees the stack.
        const summary = error instanceof Error ? error.message : typeof error;
        // eslint-disable-next-line no-console
        console.error(`Unhandled error in ${type} ${path}: ${summary}`);
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong. Please try again.",
            cause: error,
        });
    }
});

export const publicProcedure = t.procedure.use(normalizeUnknownErrors);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next();
});
