import { CloudflareEnv, Env, getCloudflareEnv } from "@backend/env";
import { Toucan } from "toucan-js";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Context } from "toucan-js/dist/types";
import { t } from "./trpc";
import { professorRouter } from "./routers/professor";
import { ratingsRouter } from "./routers/rating";
import { adminRouter } from "./routers/admin";
import { authRouter } from "./routers/auth";
import { professorParser, truncatedProfessorParser } from "./types/schema";

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
    async fetch(request: Request, rawEnv: Record<string, unknown>, cloudflareCtx: Context) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const cloudflareEnv = getCloudflareEnv(rawEnv);
        const polyratingsEnv = new Env(cloudflareEnv);

        if (cloudflareEnv.CLOUDFLARE_ENV === "local") {
            await ensureLocalDb(cloudflareEnv, polyratingsEnv);
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
                const authHeader = req.headers.get("Authorization");

                const anonymizedIdentifier = await polyratingsEnv.authStrategy.obfuscateIdentifier(
                    req.headers.get("CF-Connecting-IP"),
                );
                const user = await polyratingsEnv.authStrategy.verify(authHeader);
                return { env: polyratingsEnv, anonymizedIdentifier, user };
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

// Allows for singleton execution of ensureLocalDb
let initPromise: Promise<void>;
async function ensureLocalDb(cloudflareEnv: CloudflareEnv, polyratingsEnv: Env) {
    if (initPromise) {
        return initPromise;
    }
    let initPromiseResolver;
    initPromise = new Promise((resolve) => {
        initPromiseResolver = resolve;
    });

    // Check to find the all professor key
    const allProfessorKey = await cloudflareEnv.POLYRATINGS_TEACHERS.get("all");
    if (allProfessorKey) {
        // It will be defined. Typescript does not understand promise escaping
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        initPromiseResolver!();
        return initPromise;
    }

    const reqUrl =
        "https://raw.githubusercontent.com/Polyratings/polyratings-data/data/professor-dump.json";
    // eslint-disable-next-line no-console
    console.log(`Retrieving professor data from ${reqUrl}`);
    const githubReq = await fetch(reqUrl);
    const githubJson = await githubReq.json();
    // Verify that professors are formed correctly
    const parsedProfessors = professorParser.array().parse(githubJson);
    const truncatedProfessors = truncatedProfessorParser.array().parse(parsedProfessors);
    await cloudflareEnv.POLYRATINGS_TEACHERS.put("all", JSON.stringify(truncatedProfessors));
    for (const professor of parsedProfessors) {
        // eslint-disable-next-line no-await-in-loop
        await cloudflareEnv.POLYRATINGS_TEACHERS.put(professor.id, JSON.stringify(professor));
    }

    const password = await polyratingsEnv.authStrategy.hashPassword("password");
    polyratingsEnv.kvDao.putUser({
        username: "local",
        password,
    });

    // It will be defined. Typescript does not understand promise escaping
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    initPromiseResolver!();
    return initPromise;
}
