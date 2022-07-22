import { TRPCError } from "@trpc/server";
import { t, protectedProcedure } from "@polyratings/backend/trpc";
import { z } from "zod";

export const authRouter = t.router({
    login: t.procedure
        .input(z.object({ username: z.string(), password: z.string() }))
        .mutation(async ({ input: { username, password }, ctx }) => {
            const user = await ctx.env.kvDao.getUser(username);

            const isAuthenticated = ctx.env.authStrategy.verifyHash(user.password, password);
            if (!isAuthenticated) {
                throw new TRPCError({ code: "UNAUTHORIZED" });
            }

            return ctx.env.authStrategy.createToken(user);
        }),
    register: protectedProcedure
        .input(z.object({ username: z.string(), password: z.string() }))
        .mutation(async ({ input: { username, password }, ctx }) => {
            const hash = await ctx.env.authStrategy.hashPassword(password);

            await ctx.env.kvDao.putUser({ username, password: hash });
        }),
});

// export async function withAuth<T>(
//     ctx: Context<Env, unknown, AuthenticatedWithBody<T>>,
//     next: MiddlewareNextFunction,
// ) {
//     const authHeader = ctx.request.headers.get("Authorization");
//     const user = await ctx.env.authStrategy.verify(authHeader);
//     ctx.data = { body: ctx.data as never, user };
//     return next();
// }
