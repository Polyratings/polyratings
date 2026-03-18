import { initTRPC, TRPCError } from "@trpc/server";
import { Env } from "./env";

type Context = {
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
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to ${type} ${path}`,
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
