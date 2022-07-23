import { initTRPC, TRPCError } from "@trpc/server";
import { Env } from "./env";

type Context = {
    env: Env;
    user?: {
        username: string;
    };
};

export const t = initTRPC<{
    ctx: Context;
}>()({});

export const protectedProcedure = t.procedure.use((params) => {
    if (!params.ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return params.next(params);
});
