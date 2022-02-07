import { Context, MiddlewareNextFunction } from 'sunder';
import { Env } from '../bindings';
import { UserToken } from '../dtos/UserToken';

export type AuthenticatedWithBody<T> = { user: UserToken; body: T };

export async function withAuth<T>(
    ctx: Context<Env, unknown, AuthenticatedWithBody<T>>,
    next: MiddlewareNextFunction,
) {
    const authHeader = ctx.request.headers.get('Authorization');
    const user = await ctx.env.authStrategy.verify(authHeader);
    ctx.data = { body: ctx.data as never, user };
    return next();
}
