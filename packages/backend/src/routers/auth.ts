import { TRPCError } from "@trpc/server";
import { t, protectedProcedure } from "@backend/trpc";
import { z } from "zod";
import { setCookie, getCookie, clearCookie } from "@backend/utils/cookie-utils";

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
            const accessToken = await ctx.env.authStrategy.createAccessToken(user);
            const refreshToken = await ctx.env.authStrategy.createRefreshToken(user);

            // Set cookies in response headers
            const response = new Response();
            response.headers.append('Set-Cookie', setCookie('accessToken', accessToken, {
                maxAge: 15 * 60, // 15 minutes
            }));
            response.headers.append('Set-Cookie', setCookie('refreshToken', refreshToken, {
                maxAge: 7 * 24 * 60 * 60, // 7 days
            }));

            // Store response in context for the tRPC adapter to use
            (ctx as any).responseHeaders = response.headers;

            return { success: true };
        }),
    refresh: t.procedure
        .mutation(async ({ ctx }) => {
            const request = (ctx as any).req;
            const cookieHeader = request.headers.get('Cookie');
            const refreshToken = getCookie(cookieHeader, 'refreshToken');

            const userToken = await ctx.env.authStrategy.verifyRefreshToken(refreshToken);
            if (!userToken) {
                throw new TRPCError({ code: "UNAUTHORIZED" });
            }

            // Get user and create new access token
            const user = await ctx.env.kvDao.getUser(userToken.username);
            const newAccessToken = await ctx.env.authStrategy.createAccessToken(user);

            // Set new access token cookie
            const response = new Response();
            response.headers.append('Set-Cookie', setCookie('accessToken', newAccessToken, {
                maxAge: 15 * 60, // 15 minutes
            }));

            // Store response in context for the tRPC adapter to use
            (ctx as any).responseHeaders = response.headers;

            return { success: true };
        }),
    logout: t.procedure
        .mutation(async ({ ctx }) => {
            // Clear both cookies
            const response = new Response();
            response.headers.append('Set-Cookie', clearCookie('accessToken'));
            response.headers.append('Set-Cookie', clearCookie('refreshToken'));

            // Store response in context for the tRPC adapter to use
            (ctx as any).responseHeaders = response.headers;

            return { success: true };
        }),
    register: protectedProcedure
        .input(z.object({ username: z.string(), password: z.string() }))
        .mutation(async ({ input: { username, password }, ctx }) => {
            const hash = await ctx.env.authStrategy.hashPassword(password);

            await ctx.env.kvDao.putUser({ username, password: hash });
        }),
});
