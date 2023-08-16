import { initTRPC, TRPCError } from "@trpc/server";
import type { Env } from "./env";

type Context = {
    env: Env;
    user?: {
        username: string;
    };
};

export const t = initTRPC.context<Context>().create({});

export const protectedProcedure = t.procedure.use((params) => {
    if (!params.ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return params.next(params);
});
