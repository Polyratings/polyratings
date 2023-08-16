import { Toucan } from "toucan-js";
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
    async scheduled(event: CloudflareScheduledEvent, env: Record<string, string>, ctx: CloudflareContext) {
        const sentry = new Toucan({
            dsn: "https://f6740da514844eb2b1e6892fa31ec688@o1195960.ingest.sentry.io/6319111",
            context: ctx,
            requestDataOptions: {
                allowedHeaders: ["user-agent"],
                allowedSearchParams: /(.*)/,
            },
        });

        ctx.waitUntil(main(env, sentry));
    },
};
