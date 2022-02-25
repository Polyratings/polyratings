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
        ctx.waitUntil(main(env));
    },
};
