import { KVDAO } from "@backend/dao/kv-dao";
import {
    PassThroughRatingAnalyzer,
    OpenAIDAO,
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
import { AnonymousIdDao } from "./dao/anonymous-id-dao";
import { cloudflareAccountId } from "./generated/tomlGenerated";

export function getCloudflareEnv(rawEnv: Record<string, unknown>): CloudflareEnv {
    if (!rawEnv?.IS_DEPLOYED) {
        // Set empty default values that will cause dep injection to replace with no-ops
        return cloudflareEnvParser.parse({
            JWT_SIGNING_KEY: "TEST_SIGNING_SECRET",
            OPENAI_API_KEY: "",
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

    anonymousIdDao: AnonymousIdDao;

    rateLimiters: {
        addRating: RateLimit;
    };

    constructor(env: CloudflareEnv) {
        this.kvDao = new KVDAO(
            new KvWrapper(env.POLYRATINGS_TEACHERS),
            new KvWrapper(env.POLYRATINGS_USERS),
            new KvWrapper(env.PROCESSING_QUEUE),
            new KvWrapper(env.POLYRATINGS_TEACHER_APPROVAL_QUEUE),
            new KvWrapper(env.POLYRATINGS_REPORTS),
        );
        if (!env.IS_DEPLOYED && !env.OPENAI_API_KEY) {
            // eslint-disable-next-line no-console
            console.warn("Not using OpenAI Moderation API. Please set OPENAI_API_KEY to enable");
            this.ratingAnalyzer = new PassThroughRatingAnalyzer();
        } else {
            this.ratingAnalyzer = new OpenAIDAO(
                env.OPENAI_API_KEY,
                cloudflareAccountId,
                "moderation",
            );
        }
        if (!env.IS_DEPLOYED && !env.DISCORD_WEBHOOK_URL) {
            // eslint-disable-next-line no-console
            console.warn("Not using Discord Notifier. Please set DISCORD_WEBHOOK_URL to enable");
            this.notificationDAO = new NoOpNotificationDao();
        } else {
            this.notificationDAO = new DiscordNotificationDAO(env.DISCORD_WEBHOOK_URL);
        }

        this.authStrategy = new AuthStrategy(env.JWT_SIGNING_KEY);

        this.anonymousIdDao = new AnonymousIdDao(env.HASHED_IP, env.POLYRATINGS_SESSIONS);

        this.rateLimiters = {
            addRating: env.ADD_RATING_LIMITER,
        };
    }
}

export type CloudflareEnv = z.infer<typeof cloudflareEnvParser>;

// Can not really verify that the env is actually of type `KVNamespace`
// The least we can do is see if it is a non null object
const kvNamespaceParser = z.custom<KVNamespace>((n) => n && n !== null && typeof n === "object");
// Similar situation with the rateLimiter
const rateLimiterParser = z.custom<RateLimit>((l) => z.object({ limit: z.function() }).parse(l));
const cloudflareEnvParser = z.object({
    POLYRATINGS_TEACHERS: kvNamespaceParser,
    PROCESSING_QUEUE: kvNamespaceParser,
    POLYRATINGS_USERS: kvNamespaceParser,
    POLYRATINGS_TEACHER_APPROVAL_QUEUE: kvNamespaceParser,
    POLYRATINGS_REPORTS: kvNamespaceParser,
    POLYRATINGS_SESSIONS: kvNamespaceParser,
    JWT_SIGNING_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
    DISCORD_WEBHOOK_URL: z.string(),
    IS_DEPLOYED: z.boolean(),
    HASHED_IP: z.string(),
    ADD_RATING_LIMITER: rateLimiterParser,
});
