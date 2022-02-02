import { Context, MiddlewareNextFunction } from 'sunder';
import { BaseDTO } from '../../../shared/src/dtos/BaseDTO';
import { instanceToPlain } from 'class-transformer';

/**
 * The goal of this middleware is to coerce all response bodies to be of a BaseDTO type, which essentially enforces
 * the API contract from the backend to the frontend
 * @param ctx
 * @param next
 */
export async function polyratingsBodyMiddleware(
    ctx: Context<any>,
    next: MiddlewareNextFunction,
) {
    await next();

    if (ctx.response.body instanceof BaseDTO) { // TODO: Currently fails for most (all?) calls
        ctx.response.body = instanceToPlain(ctx.response.body, {strategy: 'excludeAll'});
    } else if (ctx.response.body) {
        console.log(ctx.response.body);
        throw new Error(`Response for ${ctx.request.url} is not of type BaseDTO\nIt is of type: ${ctx.response.body.constructor.name}`);
    }
}