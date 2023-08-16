import { Toucan } from "toucan-js";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { Context } from "toucan-js/dist/types";
import { Env } from "@backend/env";
import type { CloudflareEnv } from "@backend/env";
import { t } from "./trpc";
import { professorRouter } from "./routers/professor";
import { ratingsRouter } from "./routers/rating";
import { adminRouter } from "./routers/admin";
import { authRouter } from "./routers/auth";

export const appRouter = t.router({
    professors: professorRouter,
    ratings: ratingsRouter,
    admin: adminRouter,
    auth: authRouter,
});
export type AppRouter = typeof appRouter;

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
};

export default {
    async fetch(request: Request, coudflareEnv: CloudflareEnv, cloudflareCtx: Context) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const sentry = new Toucan({
            dsn: "https://a7c07e573f624b40b98f061b54877d9d@o1195960.ingest.sentry.io/6319110",
            context: cloudflareCtx,
            requestDataOptions: {
                allowedHeaders: ["user-agent"],
                allowedSearchParams: /(.*)/,
            },
        });

        return fetchRequestHandler({
            endpoint: "",
            req: request,
            router: appRouter,
            batching: {
                enabled: false,
            },
            createContext: async ({ req }) => {
                const env = new Env(coudflareEnv);
                const authHeader = req.headers.get("Authorization");
                const user = await env.authStrategy.verify(authHeader);
                return { env, user };
            },
            responseMeta: () => ({
                headers: {
                    "Access-Control-Max-Age": "1728000",
                    "Content-Encoding": "gzip",
                    Vary: "Accept-Encoding",
                    ...CORS_HEADERS,
                },
            }),
            onError: (errorState) => {
                if (errorState.error.code === "INTERNAL_SERVER_ERROR") {
                    sentry.captureException(errorState.error);
                }
            },
        });
    },
};
