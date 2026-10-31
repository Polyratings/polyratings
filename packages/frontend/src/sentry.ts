import * as Sentry from "@sentry/browser";

const SENTRY_DSN = "https://c9fe8d8e92a04bb585b15499bff924c5@o1195960.ingest.sentry.io/6319109";

export function isSpuriousUnhandledRejectionNoise(reason: unknown): boolean {
    if (reason === undefined || reason === null) {
        return true;
    }

    if (!(reason instanceof CustomEvent) || reason.type !== "unhandledrejection") {
        return false;
    }

    if (reason.detail == null) {
        return true;
    }

    const nestedReason =
        typeof reason.detail === "object" && reason.detail !== null && "reason" in reason.detail
            ? (reason.detail as { reason?: unknown }).reason
            : undefined;

    return !(nestedReason instanceof Error);
}

export function initSentry(): void {
    Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.2,
        // v11 collects user info, cookies, and bodies unless this is set.
        // These values match the v10 default, when sendDefaultPii was unset.
        dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: {
                request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
                response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
            },
            httpBodies: [],
            urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
            genAI: { inputs: false, outputs: false },
            databaseQueryData: false,
            graphQL: { document: false, variables: false },
        },
        beforeSend(event, hint) {
            if (isSpuriousUnhandledRejectionNoise(hint.originalException)) {
                return null;
            }

            return event;
        },
    });
}
