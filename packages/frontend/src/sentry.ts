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
        beforeSend(event, hint) {
            if (isSpuriousUnhandledRejectionNoise(hint.originalException)) {
                return null;
            }

            return event;
        },
    });
}
