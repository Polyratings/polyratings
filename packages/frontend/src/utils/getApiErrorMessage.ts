import { isTRPCClientError } from "@trpc/client";
import type { TRPCClientError } from "@trpc/client";

/** tRPC often sets `Error.message` to a bare procedure code (e.g. NOT_FOUND). Those should not replace contextual UI copy. */
const TRPC_CODE_LIKE_MESSAGE = /^[A-Z][A-Z0-9_]*$/;

/**
 * Bounded walk through `Error.cause` chains. tRPC + TanStack Query wrap the
 * original `TRPCClientError` at most a few layers deep; a small constant
 * guards against pathological chains while still finding the real cause.
 */
const MAX_TRPC_CAUSE_DEPTH = 6;

function shouldUseFallbackInsteadOfMessage(message: string): boolean {
    const t = message.trim();
    return t.length > 0 && TRPC_CODE_LIKE_MESSAGE.test(t) && !t.includes(" ");
}

function findTrpcClientErrorInChain(error: unknown): TRPCClientError<never> | undefined {
    let current: unknown = error;
    for (let depth = 0; depth < MAX_TRPC_CAUSE_DEPTH && current; depth += 1) {
        if (isTRPCClientError(current)) {
            return current;
        }
        if (!(current instanceof Error) || current.cause === undefined) {
            return undefined;
        }
        current = current.cause;
    }
    return undefined;
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
    const trpcErr = findTrpcClientErrorInChain(error);
    if (trpcErr && shouldUseFallbackInsteadOfMessage(trpcErr.message)) {
        return fallbackMessage;
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === "string" && error.trim()) {
        const t = error.trim();
        if (shouldUseFallbackInsteadOfMessage(t)) {
            return fallbackMessage;
        }
        return t;
    }
    return fallbackMessage;
}
