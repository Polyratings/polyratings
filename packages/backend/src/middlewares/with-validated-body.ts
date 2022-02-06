import { Context, MiddlewareNextFunction } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ValidationError } from 'class-validator';
import { ClassType, transformAndValidate } from 'class-transformer-validator';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { AuthenticatedWithBody } from './auth-middleware';
import { DEFAULT_VALIDATOR_OPTIONS } from '@polyratings/backend/utils/const';

// Function overloads to allow use with authentication middleware
export function withValidatedBody<T extends object>(targetType: ClassType<T>):(ctx: Context<Env, unknown, T>, next: MiddlewareNextFunction) => unknown
// Add dummy argument to have ts properly infer what the intended type is
export function withValidatedBody<T extends object>(targetType: ClassType<T>, withAuth:boolean):(ctx: Context<Env, unknown, AuthenticatedWithBody<T>>, next: MiddlewareNextFunction) => unknown

export function withValidatedBody<T extends object>(targetType: ClassType<T>) {
    return async (ctx: Context<Env, unknown, T>, next: MiddlewareNextFunction) => {
        try {
            ctx.data = await transformAndValidate(targetType, await ctx.request.json() as object, {
                validator: DEFAULT_VALIDATOR_OPTIONS
            }) as T;
        } catch (err) {
            const responseErrors: object[] = [];
            for (const error of err as ValidationError[]) {
                responseErrors.push({propertyName: error.property, reasonForFailure: error.constraints});
            }

            throw new PolyratingsError(400, responseErrors);
        }
        return next();
    };
}
