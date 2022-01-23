import { apply, Context, Handler, Middleware } from 'sunder';
import { Env } from '@polyratings/backend/bindings';

export async function withMiddlewares<T>(...middlewares: Handler<Env, T>[]) {
    return async (ctx: Context<Env, T>) => {
        try {
            await apply(middlewares, ctx);
        } catch (e) {
            ctx.throw(500, "Nested middleware failure");
        }
    };
}