import "reflect-metadata";
import { polyratingsBackend } from "@polyratings/backend/api/polyratings-backend";
import { CloudflareEventFunctions } from "sunder/application";
import { CloudflareEnv, Env } from "@polyratings/backend/bindings.d";
import Toucan from "toucan-js";

const backend = polyratingsBackend();

export default {
    async fetch(request: Request, env: CloudflareEnv, ctx: CloudflareEventFunctions) {
        const sentry = new Toucan({
            dsn: "https://a15ed5c8b61d4e43b4f103b938130722@o1154721.ingest.sentry.io/6234603",
            context: ctx,
            allowedHeaders: ["user-agent"],
            allowedSearchParams: /(.*)/,
        });
        return backend.fetch(request, new Env(env, sentry), ctx);
    },
};
