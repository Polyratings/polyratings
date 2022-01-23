import 'reflect-metadata';
import { Context, Handler, MiddlewareNextFunction } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ValidationError } from 'class-validator';
import { ClassType, transformAndValidate } from 'class-transformer-validator';

export const withValidatedBody = <T extends Object>(targetType: ClassType<T>, handler: (ctx: Context<Env, any, T>) => Promise<void>) => {
    return async (ctx: Context<Env, any>) => {
        try {
            ctx.data = await transformAndValidate(targetType, await ctx.request.json() as object, {
                validator: {
                    skipMissingProperties: false,
                    forbidNonWhitelisted: true,
                    whitelist: true
                }
            }) as T;
        } catch (err) {
            let responseErrors: object[] = [];
            for (let error of err as ValidationError[]) {
                responseErrors.push({propertyName: error.property, reasonForFailure: error.constraints});
            }

            ctx.response.status = 400;
            ctx.response.statusText = "Encountered a validation error";
            ctx.response.body = { responseErrors };
            return;
        }
        await handler(ctx);
    };
}
