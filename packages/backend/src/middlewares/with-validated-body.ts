import { Context, MiddlewareNextFunction } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ValidationError } from 'class-validator';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { AuthenticatedWithBody } from './auth-middleware';
import { Constructs, transformAndValidate } from '../utils/transform-and-validate';

// Function overloads to allow use with authentication middleware
export function withValidatedBody<T extends object>(targetType: Constructs<T>):(ctx: Context<Env, unknown, T>, next: MiddlewareNextFunction) => unknown
// Add dummy argument to have ts properly infer what the intended type is
export function withValidatedBody<T extends object>(targetType: Constructs<T>, withAuth:boolean):(ctx: Context<Env, unknown, AuthenticatedWithBody<T>>, next: MiddlewareNextFunction) => unknown

export function withValidatedBody<T extends object>(targetType: Constructs<T>) {
    return async (ctx: Context<Env, unknown, T>, next: MiddlewareNextFunction) => {
        try {
            ctx.data = await transformAndValidate(targetType, await ctx.request.json());
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
