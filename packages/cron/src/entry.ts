import "reflect-metadata";
import Toucan from "toucan-js";
import {
    Client,
    cloudflareAccountId,
    cloudflareNamespaceInformation,
    PROD_ENV,
} from "@polyratings/client";
import { syncKvStore } from "./steps/syncKvStore";
import { cloudflareKVInit } from "./wrappers/kv-wrapper";
import { Logger } from "./logger";
import { clearKvStore } from "./steps/clearKvStore";
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
        {
            name: "syncProfessors",
            task: syncKvStore("professors", "POLYRATINGS_TEACHERS", new Set(["all"])),
        },
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
    KVWrapper: ReturnType<typeof cloudflareKVInit>;
}

async function createRuntimeEnvironment(
    globalEnv: Record<string, string | undefined>,
): Promise<CronEnv> {
    const polyratingsCIUsername = globalEnv.POLYRATINGS_CI_USERNAME;
    const polyratingsCIPassword = globalEnv.POLYRATINGS_CI_PASSWORD;
    const cfApiToken = globalEnv.CF_API_TOKEN;

    // Make sure all keys are defined
    if (!polyratingsCIUsername || !polyratingsCIPassword || !cfApiToken) {
        throw new Error("Could not create cron environment. A required variable was not set");
    }

    const authenticatedProductionClient = new Client(PROD_ENV);
    await authenticatedProductionClient.auth.login({
        username: polyratingsCIUsername,
        password: polyratingsCIPassword,
    });

    const KVWrapper = cloudflareKVInit(cfApiToken, cloudflareAccountId);

    return {
        authenticatedProductionClient,
        KVWrapper,
    };
}
