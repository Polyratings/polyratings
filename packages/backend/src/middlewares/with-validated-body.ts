import 'reflect-metadata';
import { Context, Handler, MiddlewareNextFunction } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ValidationError } from 'class-validator';
import { ClassType, transformAndValidateSync } from 'class-transformer-validator';

export const withValidatedBody = <T extends object>(targetType: ClassType<T>, handler: Handler<Env, any>) => {
    return async (ctx: Context<Env, any>, _: MiddlewareNextFunction) => {
        // logging statements to run in cloudflare portal
        // console.log("We entered validate body!");
        // console.log(await ctx.request.json());
        try {
            // TODO: Determine why this call errors on objects that appear fine
            ctx.data = transformAndValidateSync(targetType, await ctx.request.json(), {
                // for some reason this configuration always rejects the object
                // even if it appears it should pass
                validator: {
                    forbidNonWhitelisted: true,
                    whitelist: true,
                    skipMissingProperties: false
                }
            });
            // console.log("we validated this time!!")
            // console.log(ctx.data)
            await handler(ctx, () => undefined);
        } catch (err) {
            let responseErrors: object[] = [];
            for (let error of err as ValidationError[]) {
                responseErrors.push({propertyName: error.property, reasonForFailure: error.constraints});
            }
            // console.log("we got an error!");
            ctx.response.status = 400;
            ctx.response.statusText = "Encountered a validation error";
            ctx.response.body = { responseErrors };
        }
    };
}