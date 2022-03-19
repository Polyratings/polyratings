import "reflect-metadata";
import * as toml from "toml";
import Toucan from "toucan-js";
import { Client, PROD_ENV } from "@polyratings/client";
import { syncKvStore } from "./steps/syncKvStore";
import { cloudflareKVInit } from "./wrappers/kv-wrapper";
import { Logger } from "./logger";
// importing across monorepo modules
// Typically this should be exported except it is a deployment file
// eslint-disable-next-line import/no-relative-packages
import backendDeployToml from "../../backend/wrangler.toml";
import { clearKvStore } from "./steps/clearKvStore";

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
        { name: "syncProfessors", task: syncKvStore("professors", "POLYRATINGS_TEACHERS") },
        {
            name: "syncProfessors",
            task: syncKvStore("professor-queue", "POLYRATINGS_TEACHER_APPROVAL_QUEUE"),
        },
        { name: "syncProfessors", task: syncKvStore("users", "POLYRATINGS_USERS") },
        { name: "syncProfessors", task: syncKvStore("reports", "POLYRATINGS_REPORTS") },
        { name: "clearReviewQueue", task: clearKvStore("PROCESSING_QUEUE") },
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

export interface CronEnv {
    authenticatedProductionClient: Client;
    getKvId: typeof getKvId;
    KVWrapper: ReturnType<typeof cloudflareKVInit>;
}

const parsedToml = toml.parse(backendDeployToml);
export type EnvironmentKey = "prod" | "beta" | "dev";
export type KvName =
    | "POLYRATINGS_TEACHERS"
    | "PROCESSING_QUEUE"
    | "POLYRATINGS_TEACHER_APPROVAL_QUEUE"
    | "POLYRATINGS_USERS"
    | "POLYRATINGS_REPORTS";
function getKvId(environmentKey: EnvironmentKey, kvName: KvName): string {
    const id = parsedToml.env[environmentKey].kv_namespaces.find(
        (namespace: Record<string, unknown>) => namespace.binding === kvName,
    )?.id;

    if (!id) {
        throw new Error(`Could not find KV id for ${kvName} in ${environmentKey} environment`);
    }
    return id;
}

async function createRuntimeEnvironment(
    globalEnv: Record<string, string | undefined>,
): Promise<CronEnv> {
    const prodWorkerUrl = `https://${parsedToml.env.prod.route.slice(0, -1)}`;
    // Have to check for this key specifically since it is used before the undefined check
    if (!prodWorkerUrl) {
        throw new Error("Could not read prod worker url from toml");
    }

    const accountId = parsedToml.account_id;
    const polyratingsCIUsername = globalEnv.POLYRATINGS_CI_USERNAME;
    const polyratingsCIPassword = globalEnv.POLYRATINGS_CI_PASSWORD;
    const cfApiToken = globalEnv.CF_API_TOKEN;

    // Make sure all keys are defined
    if (!accountId || !polyratingsCIUsername || !polyratingsCIPassword || !cfApiToken) {
        throw new Error("Could not create cron environment. A required variable was not set");
    }

    const authenticatedProductionClient = new Client(PROD_ENV);
    await authenticatedProductionClient.auth.login({
        username: polyratingsCIUsername,
        password: polyratingsCIPassword,
    });

    const KVWrapper = cloudflareKVInit(cfApiToken, accountId);

    return {
        getKvId,
        authenticatedProductionClient,
        KVWrapper,
    };
}
