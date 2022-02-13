import { Env } from '@polyratings/backend/bindings';
import { Context } from 'sunder';
import { AuthResponse, LoginRequest } from '@polyratings/shared';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { User } from '@polyratings/backend/dtos/User';

export class AuthHandler {
    static async login(ctx: Context<Env, unknown, LoginRequest>) {
        const { username, password } = ctx.data;

        const user = await ctx.env.kvDao.getUser(username);
        console.log(user)

        const isAuthenticated = await ctx.env.authStrategy.verifyHash(
            user.password,
            password,
        );

        if (!isAuthenticated) {
            throw new PolyratingsError(401, 'Incorrect Credentials');
        }

        const token = await ctx.env.authStrategy.createToken(user);
        ctx.response.body = AuthResponse.new(token)
    }

    // Convenience for registering users
    // Please disable if not in active use
    static async register(ctx: Context<Env, { secret: string }, LoginRequest>) {
        if (ctx.params.secret !== ctx.env.authStrategy.jwtSigningKey) {
            throw new PolyratingsError(401, 'THIS IS FOR DEVS ONLY!!!!');
        }
        const { username, password } = ctx.data;
        const hash = await ctx.env.authStrategy.hashPassword(password);

        await ctx.env.kvDao.putUser(new User(username, hash));
    }
}
