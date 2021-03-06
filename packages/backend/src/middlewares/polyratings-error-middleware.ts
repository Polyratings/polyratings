import { Context, HttpStatus, MiddlewareNextFunction } from "sunder";
import { PolyratingsError } from "@polyratings/backend/utils/errors";
import { PolyratingsError as PolyratingsErrorPublic } from "@polyratings/shared";
import { Env } from "@polyratings/backend/bindings";

export async function polyratingsErrorMiddleware(ctx: Context<Env>, next: MiddlewareNextFunction) {
    try {
        await next();
    } catch (err) {
        // All original headers and status text are deleted
        ctx.response.headers = new Headers();
        ctx.response.statusText = undefined;

        if (err instanceof PolyratingsError) {
            ctx.response.status = err.status;
            ctx.response.body = { message: err.body, status: err.status };
        } else {
            ctx.env.sentry.captureException(err);
            // eslint-disable-next-line no-console
            console.error(err);
            ctx.response.status = HttpStatus.InternalServerError;
            const body: PolyratingsErrorPublic = {
                message: "Internal server error: non-http error.",
            };
            ctx.response.body = body;
        }
    }
}
