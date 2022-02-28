import Toucan from "toucan-js";
import { main } from "./entry";

interface CloudflareContext {
    waitUntil: (p: Promise<void>) => void;
}

interface CloudflareScheduledEvent {
    cron: string;
    scheduledTime: string;
    type: "scheduled";
}

export default {
    async scheduled(
        event: CloudflareScheduledEvent,
        env: Record<string, string>,
        ctx: CloudflareContext,
    ) {
        const sentry = new Toucan({
            dsn: "https://a15ed5c8b61d4e43b4f103b938130722@o1154721.ingest.sentry.io/6234603",
            context: ctx,
            allowedHeaders: ["user-agent"],
            allowedSearchParams: /(.*)/,
        });

        ctx.waitUntil(main(env, sentry));
    },
};
