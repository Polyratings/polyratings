export function textResult(data: unknown) {
    return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
}

export function errorResult(message: string) {
    return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
    };
}

export function formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
}

export function requireToken(): string {
    const token = process.env.POLYRATINGS_ADMIN_TOKEN ?? null;
    if (!token) {
        throw new Error(
            "No admin token configured. Set POLYRATINGS_ADMIN_TOKEN in the MCP server environment. " +
                "Run packages/mcp-server/scripts/get-token.sh to obtain one.",
        );
    }
    return token;
}

type PublicHandler<Args> = (args: Args) => Promise<unknown>;
type AdminHandler<Args> = (args: Args, token: string) => Promise<unknown>;
type PreValidate<Args> = (args: Args) => string | null;

// Wraps a public-tool body in the standard try/catch + textResult/errorResult
// so each registerTool call stays a one-liner.
export function publicTool<Args>(failPrefix: string, fn: PublicHandler<Args>) {
    return async (args: Args) => {
        try {
            return textResult(await fn(args));
        } catch (err) {
            return errorResult(`${failPrefix}: ${formatError(err)}`);
        }
    };
}

// Same as publicTool but fetches the admin token first and passes it through.
// Optional preValidate runs BEFORE the token check so input-shape errors don't
// require the caller to set POLYRATINGS_ADMIN_TOKEN first. Return the error
// string to reject, or null to proceed.
export function adminTool<Args>(
    failPrefix: string,
    fn: AdminHandler<Args>,
    preValidate?: PreValidate<Args>,
) {
    return async (args: Args) => {
        const validationError = preValidate?.(args);
        if (validationError) return errorResult(validationError);
        try {
            const token = requireToken();
            return textResult(await fn(args, token));
        } catch (err) {
            return errorResult(`${failPrefix}: ${formatError(err)}`);
        }
    };
}

// Sequentially applies fn to each unique id, collecting per-id success/error,
// and returns the standard bulk summary shape used by all bulk admin tools.
// Kept sequential on purpose: the underlying endpoints (ratings.add, pending
// queue writes) are rate-limited and enforce duplicate-text guards.
export async function runBulk(
    ids: readonly string[],
    opts: {
        idKey: string;
        action: string;
        successKey: string;
        fn: (id: string) => Promise<void>;
    },
): Promise<Record<string, unknown>> {
    const unique = [...new Set(ids)];
    const results: Array<Record<string, unknown>> = [];
    for (const id of unique) {
        try {
            await opts.fn(id);
            results.push({ [opts.idKey]: id, success: true });
        } catch (err) {
            results.push({ [opts.idKey]: id, success: false, error: formatError(err) });
        }
    }
    const succeeded = results.filter((r) => r.success).length;
    return {
        action: opts.action,
        attempted: results.length,
        [opts.successKey]: succeeded,
        failed: results.length - succeeded,
        results,
    };
}
