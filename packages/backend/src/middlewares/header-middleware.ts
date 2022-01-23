import { Env } from '@polyratings/backend/bindings';
import { Context, MiddlewareNextFunction } from 'sunder';

export async function headerMiddleware(ctx: Context<Env>, next: MiddlewareNextFunction) {
    ctx.request.set("My-Stupid-Header", "My-Stupid-Value");
    await next();
}