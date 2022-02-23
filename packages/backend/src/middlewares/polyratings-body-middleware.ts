import { Context, MiddlewareNextFunction } from "sunder";
import { BaseDTO } from "@polyratings/shared";
import { instanceToPlain } from "class-transformer";
import { DtoBypass } from "@polyratings/backend/dtos/DtoBypass";

/**
 * The goal of this middleware is to coerce all response bodies to be of a BaseDTO type, which essentially enforces
 * the API contract from the backend to the frontend
 * @param ctx
 * @param next
 */
export async function polyratingsBodyMiddleware(
    ctx: Context<unknown>,
    next: MiddlewareNextFunction,
) {
    await next();
    if (
        ctx.response.body &&
        // eslint-disable-next-line no-underscore-dangle
        (ctx.response.body.constructor as typeof BaseDTO).__base_dto_marker__
    ) {
        // TODO(mfish33): Find why strategy:'excludeAll' does not work for record types?
        //  We could replace the record with a array type
        ctx.response.body = instanceToPlain(ctx.response.body);
    } else if (ctx.response.body instanceof DtoBypass) {
        ctx.response.body = ctx.response.body.payload;
    } else if (ctx.response.body) {
        throw new Error(
            `Response for ${ctx.request.url} is not of type BaseDTO\nIt is of type: ${ctx.response.body.constructor.name}`,
        );
    }
}
