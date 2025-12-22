import { TRPCError } from "@trpc/server";

/**
 * Wraps an asynchronous function to ensure that any thrown error is an instance of `TRPCError`.
 *
 * If the wrapped function throws an error that is not a `TRPCError`, this middleware catches it
 * and throws a new `TRPCError` internal server error with the provided message and the original error as its cause.
 *
 * @typeParam TArgs - The argument types of the wrapped function.
 * @typeParam TResult - The return type of the wrapped function.
 * @param fn - The asynchronous function to wrap.
 * @param message - The error message to use if a non-TRPCError is thrown.
 * @returns A new function that wraps the original, ensuring all errors are `TRPCError` instances.
 */
export function ensureTRPCError<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    message: string,
) {
    return async (...args: TArgs): Promise<TResult> => {
        try {
            return await fn(...args);
        } catch (error) {
            if (error instanceof TRPCError) throw error;

            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message,
                cause: error,
            });
        }
    };
}
