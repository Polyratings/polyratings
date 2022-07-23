import { KVDAO } from "@backend/dao/kv-dao";
import { PerspectiveDAO } from "@backend/dao/perspective-dao";
import { AuthStrategy } from "@backend/dao/auth-strategy";
import Toucan from "toucan-js";
import { DiscordNotificationDAO } from "@backend/dao/discord-notification-dao";
import { KvWrapper } from "./dao/kv-wrapper";

export class Env {
    kvDao: KVDAO;

    perspectiveDao: PerspectiveDAO;

    authStrategy: AuthStrategy;

    notificationDAO: DiscordNotificationDAO;

    constructor(env: CloudflareEnv, public sentry: Toucan) {
        this.kvDao = new KVDAO(
            new KvWrapper(env.POLYRATINGS_TEACHERS),
            new KvWrapper(env.POLYRATINGS_USERS),
            new KvWrapper(env.PROCESSING_QUEUE),
            new KvWrapper(env.POLYRATINGS_TEACHER_APPROVAL_QUEUE),
            new KvWrapper(env.POLYRATINGS_REPORTS),
        );
        this.perspectiveDao = new PerspectiveDAO(env.PERSPECTIVE_API_KEY);
        this.authStrategy = new AuthStrategy(env.JWT_SIGNING_KEY);
        this.notificationDAO = new DiscordNotificationDAO(env.DISCORD_WEBHOOK_URL);
    }
}

export interface CloudflareEnv {
    POLYRATINGS_TEACHERS: KVNamespace;
    PROCESSING_QUEUE: KVNamespace;
    POLYRATINGS_USERS: KVNamespace;
    POLYRATINGS_TEACHER_APPROVAL_QUEUE: KVNamespace;
    POLYRATINGS_REPORTS: KVNamespace;
    JWT_SIGNING_KEY: string;
    PERSPECTIVE_API_KEY: string;
    DISCORD_WEBHOOK_URL: string;
}
