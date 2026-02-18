import { TRPCError } from "@trpc/server";
import { t, protectedProcedure } from "@backend/trpc";
import { z } from "zod";
import { ensureTRPCError } from "@backend/middleware/ensure-trpc-error";

export const authRouter = t.router({
    login: t.procedure.input(z.object({ username: z.string(), password: z.string() })).mutation(
        ensureTRPCError(async ({ input: { username, password }, ctx }) => {
            const user = await ctx.env.kvDao.getUser(username);

            const isAuthenticated = ctx.env.authStrategy.verifyHash(user.password, password);
            if (!isAuthenticated) {
                throw new TRPCError({ code: "UNAUTHORIZED" });
            }

            return ctx.env.authStrategy.createToken(user);
        }, "Failed to login"),
    ),
    register: protectedProcedure
        .input(z.object({ username: z.string(), password: z.string() }))
        .mutation(
            ensureTRPCError(async ({ input: { username, password }, ctx }) => {
                const hash = await ctx.env.authStrategy.hashPassword(password);

                await ctx.env.kvDao.putUser({ username, password: hash });
            }, "Failed to register"),
        ),
});
