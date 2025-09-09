import { TRPCError } from "@trpc/server";
import { t, protectedProcedure } from "@backend/trpc";
import { z } from "zod";
import { setCookie, getCookie, clearCookie } from "@backend/utils/cookie-utils";

interface AuthContext {
    env: any;
    req?: Request;
    user?: { username: string };
    setCookies?: string[];
}

export const authRouter = t.router({
    login: t.procedure
        .input(z.object({ username: z.string(), password: z.string() }))
        .mutation(async ({ input: { username, password }, ctx }) => {
            const user = await ctx.env.kvDao.getUser(username);

            const isAuthenticated = ctx.env.authStrategy.verifyHash(user.password, password);
            if (!isAuthenticated) {
                throw new TRPCError({ code: "UNAUTHORIZED" });
            }

            // Create access and refresh tokens
            const accessTokenResult = await ctx.env.authStrategy.createAccessToken(user);
            const refreshTokenResult = await ctx.env.authStrategy.createRefreshToken(user);

            // Store cookies to be set in response
            const authCtx = ctx as AuthContext;
            authCtx.setCookies = [
                setCookie('accessToken', accessTokenResult.token, {
                    maxAge: accessTokenResult.maxAge,
                }),
                setCookie('refreshToken', refreshTokenResult.token, {
                    maxAge: refreshTokenResult.maxAge,
                })
            ];

            return { success: true };
        }),
    logout: t.procedure
        .mutation(async ({ ctx }) => {
            // Store cookies to be cleared in response
            const authCtx = ctx as AuthContext;
            authCtx.setCookies = [
                clearCookie('accessToken'),
                clearCookie('refreshToken')
            ];

            return { success: true };
        }),
    register: protectedProcedure
        .input(z.object({ username: z.string(), password: z.string() }))
        .mutation(async ({ input: { username, password }, ctx }) => {
            const hash = await ctx.env.authStrategy.hashPassword(password);

            await ctx.env.kvDao.putUser({ username, password: hash });
        }),
});
