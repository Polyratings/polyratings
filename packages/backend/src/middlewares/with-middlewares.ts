import { apply, Context, Handler } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { PathParams } from 'sunder/middleware/router';

export const withMiddlewares = <T extends PathParams<any>, U>(...middlewares: Handler<Env, T, U>[]) => {
    return async (ctx: Context<Env, T>) => {
        try {
            await apply(middlewares, ctx);
        } catch (e) {
            console.error(e);
            throw e;
        }
    };
}
