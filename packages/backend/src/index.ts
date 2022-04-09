import "reflect-metadata";
import { polyratingsBackend } from "@polyratings/backend/api/polyratings-backend";
import { CloudflareEventFunctions } from "sunder/application";
import { CloudflareEnv, Env } from "@polyratings/backend/bindings.d";
import Toucan from "toucan-js";

const backend = polyratingsBackend();

export default {
    async fetch(request: Request, env: CloudflareEnv, ctx: CloudflareEventFunctions) {
        const sentry = new Toucan({
            dsn: "https://a7c07e573f624b40b98f061b54877d9d@o1195960.ingest.sentry.io/6319110",
            context: ctx,
            allowedHeaders: ["user-agent"],
            allowedSearchParams: /(.*)/,
        });
        return backend.fetch(request, new Env(env, sentry), ctx);
    },
};
