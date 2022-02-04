import { Context, HttpStatus, MiddlewareNextFunction } from 'sunder';
import { PolyratingsError } from '@polyratings/backend/utils/errors';

export async function polyratingsErrorMiddleware(
    ctx: Context<unknown>,
    next: MiddlewareNextFunction,
) {
    try {
        await next();
    } catch (err) {
        // All original headers are deleted
        ctx.response.headers = new Headers();

        if (err instanceof PolyratingsError) {
            ctx.response.status = err.status;
            ctx.response.body = { message: err.body, status: err.status };
        } else {
            // TODO: Add internal error logging
            ctx.response.status = HttpStatus.InternalServerError;
            ctx.response.body = { message: "Internal server error: non-http error." }
        }
    }
}