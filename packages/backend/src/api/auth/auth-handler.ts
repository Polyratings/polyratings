import { Env } from "@polyratings/backend/bindings";
import { Context } from "sunder";
import { AuthResponse, LoginRequest, Internal } from "@polyratings/shared";
import { PolyratingsError } from "@polyratings/backend/utils/errors";
import { AuthenticatedWithBody } from "@polyratings/backend/middlewares/auth-middleware";

export class AuthHandler {
    static async login(ctx: Context<Env, unknown, LoginRequest>) {
        const { username, password } = ctx.data;

        const user = await ctx.env.kvDao.getUser(username);

        const isAuthenticated = await ctx.env.authStrategy.verifyHash(user.password, password);

        if (!isAuthenticated) {
            throw new PolyratingsError(401, "Incorrect Credentials");
        }

        const token = await ctx.env.authStrategy.createToken(user);
        ctx.response.body = AuthResponse.new(token);
    }

    // Convenience for registering users
    // Please disable if not in active use
    static async register(ctx: Context<Env, unknown, AuthenticatedWithBody<LoginRequest>>) {
        const { username, password } = ctx.data.body;
        const hash = await ctx.env.authStrategy.hashPassword(password);

        await ctx.env.kvDao.putUser(new Internal.User(username, hash));
    }
}
