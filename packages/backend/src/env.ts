import { KVDAO } from "@backend/dao/kv-dao";
import {
    PassThroughRatingAnalyzer,
    PerspectiveDAO,
    RatingAnalyzer,
} from "@backend/dao/rating-analyzer-dao";
import { AuthStrategy } from "@backend/dao/auth-strategy";
import {
    DiscordNotificationDAO,
    NoOpNotificationDao,
    NotificationDAO,
} from "@backend/dao/discord-notification-dao";
import { z } from "zod";
import { KvWrapper } from "./dao/kv-wrapper";

export function getCloudflareEnv(rawEnv: Record<string, unknown>): CloudflareEnv {
    if (rawEnv?.CLOUDFLARE_ENV === "local") {
        // Set empty default values that will cause dep injection to replace with no-ops
        return cloudflareEnvParser.parse({
            JWT_SIGNING_KEY: "TEST_SIGNING_SECRET",
            PERSPECTIVE_API_KEY: "",
            DISCORD_WEBHOOK_URL: "",
            ...rawEnv,
        });
    }
    return cloudflareEnvParser.parse(rawEnv);
}

export class Env {
    kvDao: KVDAO;

    ratingAnalyzer: RatingAnalyzer;

    authStrategy: AuthStrategy;

    notificationDAO: NotificationDAO;

    constructor(env: CloudflareEnv) {
        this.kvDao = new KVDAO(
            new KvWrapper(env.POLYRATINGS_TEACHERS),
            new KvWrapper(env.POLYRATINGS_USERS),
            new KvWrapper(env.PROCESSING_QUEUE),
            new KvWrapper(env.POLYRATINGS_TEACHER_APPROVAL_QUEUE),
            new KvWrapper(env.POLYRATINGS_REPORTS),
        );
        if (env.CLOUDFLARE_ENV === "local" && !env.PERSPECTIVE_API_KEY) {
            // eslint-disable-next-line no-console
            console.warn("Not using Perspective API. Please set PERSPECTIVE_API_KEY to enable");
            this.ratingAnalyzer = new PassThroughRatingAnalyzer();
        } else {
            this.ratingAnalyzer = new PerspectiveDAO(env.PERSPECTIVE_API_KEY);
        }
        if (env.CLOUDFLARE_ENV === "local" && !env.DISCORD_WEBHOOK_URL) {
            // eslint-disable-next-line no-console
            console.warn("Not using Discord Notifier. Please set DISCORD_WEBHOOK_URL to enable");
            this.notificationDAO = new NoOpNotificationDao();
        } else {
            this.notificationDAO = new DiscordNotificationDAO(env.DISCORD_WEBHOOK_URL);
        }

        this.authStrategy = new AuthStrategy(env.JWT_SIGNING_KEY);
    }
}

export type CloudflareEnv = z.infer<typeof cloudflareEnvParser>;

// Can not really verify that the env is actually of type `KVNamespace`
// The least we can do is see if it is a non null object
const kvNamespaceParser = z.custom<KVNamespace>((n) => n && n !== null && typeof n === "object");
const cloudflareEnvParser = z.object({
    POLYRATINGS_TEACHERS: kvNamespaceParser,
    PROCESSING_QUEUE: kvNamespaceParser,
    POLYRATINGS_USERS: kvNamespaceParser,
    POLYRATINGS_TEACHER_APPROVAL_QUEUE: kvNamespaceParser,
    POLYRATINGS_REPORTS: kvNamespaceParser,
    JWT_SIGNING_KEY: z.string(),
    PERSPECTIVE_API_KEY: z.string(),
    DISCORD_WEBHOOK_URL: z.string(),
    CLOUDFLARE_ENV: z.enum(["local", "dev", "beta", "prod"]),
});
