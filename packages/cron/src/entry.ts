import Toucan from "toucan-js";
import {
    cloudflareAccountId,
    cloudflareNamespaceInformation,
    PROD_ENV,
} from "@backend/generated/tomlGenerated";
import type { AppRouter } from "@backend/index";
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { syncKvStore } from "./steps/syncKvStore";
import { cloudflareKVInit } from "./wrappers/kv-wrapper";
import { Logger } from "./logger";
import { generateAllProfessorEntry } from "./steps/generateAllProfessorEntry";

export type KvName = keyof typeof cloudflareNamespaceInformation;

export async function main(env: Record<string, string | undefined>, sentry?: Toucan) {
    let runtimeEnv: CronEnv;
    try {
        runtimeEnv = await createRuntimeEnvironment(env);
    } catch (e) {
        sentry?.captureException(e);
        Logger.error(`Failed to create cron runtime environment\nReceived Error: ${e}`);
        return;
    }

    const tasks = [
        { name: "generateAllProfessorEntry", task: generateAllProfessorEntry },
        // We purposely ignore the `all` professor key to avoid issues around eventual consistency
        {
            name: "sync all professors key",
            task: syncKvStore("professors", "POLYRATINGS_TEACHERS", new Set(["all"])),
        },
        {
            name: "sync professors",
            task: syncKvStore("professor-queue", "POLYRATINGS_TEACHER_APPROVAL_QUEUE"),
        },
        { name: "sync users", task: syncKvStore("users", "POLYRATINGS_USERS") },
        { name: "sync reports", task: syncKvStore("reports", "POLYRATINGS_REPORTS") },
        { name: "sync rating log", task: syncKvStore("rating-log", "PROCESSING_QUEUE") },
    ];

    for (const { task, name } of tasks) {
        try {
            await task(runtimeEnv);
        } catch (e) {
            sentry?.captureException(e);
            Logger.error(`Failed to run \`${name}\`\n`, `Got Error: ${e}`);
        }
    }
}

export type CronEnv = Awaited<ReturnType<typeof createRuntimeEnvironment>>;

async function createRuntimeEnvironment(globalEnv: Record<string, string | undefined>) {
    const polyratingsCIUsername = globalEnv.POLYRATINGS_CI_USERNAME;
    const polyratingsCIPassword = globalEnv.POLYRATINGS_CI_PASSWORD;
    const cfApiToken = globalEnv.CLOUDFLARE_API_TOKEN;

    // Make sure all keys are defined
    if (!polyratingsCIUsername || !polyratingsCIPassword || !cfApiToken) {
        throw new Error("Could not create cron environment. A required variable was not set");
    }

    const prodClient = createTRPCProxyClient<AppRouter>({
        links: [httpLink({ url: PROD_ENV.url })],
    });
    const jwt = await prodClient.auth.login.mutate({
        username: polyratingsCIUsername,
        password: polyratingsCIPassword,
    });

    const authenticatedProductionClient = createTRPCProxyClient<AppRouter>({
        links: [
            httpLink({
                url: PROD_ENV.url,
                headers: {
                    authorization: `Bearer ${jwt}`,
                },
            }),
        ],
    });

    const KVWrapper = cloudflareKVInit(cfApiToken, cloudflareAccountId);

    return {
        authenticatedProductionClient,
        KVWrapper,
    };
}
