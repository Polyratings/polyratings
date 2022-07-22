import "reflect-metadata";
import { CloudflareEventFunctions } from "sunder/application";
import { CloudflareEnv, Env } from "@polyratings/backend/bindings.d";
import Toucan from "toucan-js";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers/app";

export default {
    async fetch(
        request: Request,
        coudflareEnv: CloudflareEnv,
        cloudflareCtx: CloudflareEventFunctions,
    ) {
        const sentry = new Toucan({
            dsn: "https://a7c07e573f624b40b98f061b54877d9d@o1195960.ingest.sentry.io/6319110",
            context: cloudflareCtx,
            allowedHeaders: ["user-agent"],
            allowedSearchParams: /(.*)/,
        });

        return fetchRequestHandler({
            endpoint: "",
            req: request,
            router: appRouter,
            createContext: async ({ req }) => {
                const env = new Env(coudflareEnv, sentry);
                const authHeader = req.headers.get("Authorization");
                const user = await env.authStrategy.verify(authHeader);
                return { env, user };
            },
            responseMeta: () => ({
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": "1728000",
                    "Content-Encoding": "gzip",
                    Vary: "Accept-Encoding",
                },
            }),
        });
    },
};
