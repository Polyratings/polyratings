import { Context, MiddlewareNextFunction } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ValidationError } from 'class-validator';
import { ClassType, transformAndValidate } from 'class-transformer-validator';
import { PolyratingsError } from '@polyratings/backend/utils/errors';

export function withValidatedBody<T extends object>(targetType: ClassType<T>) {
    return async (ctx: Context<Env, unknown, T>, next: MiddlewareNextFunction) => {
        try {
            ctx.data = await transformAndValidate(targetType, await ctx.request.json() as object, {
                validator: {
                    skipMissingProperties: false,
                    forbidNonWhitelisted: true,
                    whitelist: true
                }
            }) as T;
        } catch (err) {
            const responseErrors: object[] = [];
            for (const error of err as ValidationError[]) {
                responseErrors.push({propertyName: error.property, reasonForFailure: error.constraints});
            }

            throw new PolyratingsError(400, responseErrors);
        }
        await next();
    };
}
