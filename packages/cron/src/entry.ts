import "reflect-metadata";
import { Teacher } from "@polyratings/shared";
import * as toml from "toml";
import * as fs from "node:fs";
import { syncProfessors } from "./steps/syncProfessors";
import { cloudflareKVInit } from "./wrappers/kv-wrapper";
import { Logger } from "./logger";
import { PolyratingsWorkerWrapper } from "./wrappers/worker-wrapper";
// importing across monorepo modules
// Typically this should be exported except it is a deployment file
// eslint-disable-next-line import/no-relative-packages
import backendDeployToml from "../../backend/wrangler.toml";
import { clearProcessingQueues } from "./steps/clearProcessingQueues";

export async function main(env: Record<string, string>) {
    let runtimeEnv: CronEnv;
    try {
        runtimeEnv = await createRuntimeEnvironment(env);
    } catch (e) {
        Logger.error(`Failed to create cron runtime environment\nReceived Error: ${e}`);
        return;
    }

    const tasks = [
        { name: "syncProfessors", task: syncProfessors },
        { name: "clearProcessingQueues", task: clearProcessingQueues },
    ];

    for (const { task, name } of tasks) {
        try {
            await task(runtimeEnv);
        } catch (e) {
            Logger.error(`Failed to run \`${name}\`\n`, `Got Error: ${(e as Error).toString()}`);
        }
    }
}

export interface CronEnv {
    accountId: string;
    prodProfessorData: [string, Teacher][];
    prodWorkerUrl: string;
    betaProfessorKvId: string;
    devProfessorKvId: string;
    reviewProcessingQueueId: string;
    professorProcessingQueueId: string;
    polyratingsCIUsername: string;
    polyratingsCIPassword: string;
    KVWrapper: ReturnType<typeof cloudflareKVInit>;
}

async function createRuntimeEnvironment(globalEnv: Record<string, string>): Promise<CronEnv> {
    const parsedToml = toml.parse(backendDeployToml);
    const prodWorkerUrl = `https://${parsedToml.env.prod.route.slice(0, -1)}`;
    // Have to check for this key specifically since it is used before the undefined check
    if (!prodWorkerUrl) {
        throw new Error("Could not read prod worker url from toml");
    }

    const accountId = parsedToml.account_id;
    const betaProfessorKvId = parsedToml.env.beta.kv_namespaces.find(
        (namespace: Record<string, unknown>) => namespace.binding === "POLYRATINGS_TEACHERS",
    )?.id;
    const devProfessorKvId = parsedToml.env.dev.kv_namespaces.find(
        (namespace: Record<string, unknown>) => namespace.binding === "POLYRATINGS_TEACHERS",
    )?.id;
    const reviewProcessingQueueId = parsedToml.env.prod.kv_namespaces.find(
        (namespace: Record<string, unknown>) => namespace.binding === "PROCESSING_QUEUE",
    )?.id;
    const professorProcessingQueueId = parsedToml.env.prod.kv_namespaces.find(
        (namespace: Record<string, unknown>) =>
            namespace.binding === "POLYRATINGS_TEACHER_APPROVAL_QUEUE",
    )?.id;

    const polyratingsCIUsername = globalEnv.POLYRATINGS_CI_USERNAME;
    const polyratingsCIPassword = globalEnv.POLYRATINGS_CI_PASSWORD;

    Logger.info("Getting professors from prod");
    const polyratingsProdWorker = new PolyratingsWorkerWrapper(prodWorkerUrl);
    await polyratingsProdWorker.login(polyratingsCIUsername, polyratingsCIPassword);
    const prodProfessorData = await polyratingsProdWorker.professorEntries();
    Logger.info(`Got ${prodProfessorData.length} professors from prod`);
    fs.writeFileSync("./dump.json", JSON.stringify(prodProfessorData));

    const KVWrapper = cloudflareKVInit(globalEnv.CF_API_KEY, globalEnv.CF_EMAIL);

    const out: CronEnv = {
        accountId,
        betaProfessorKvId,
        devProfessorKvId,
        reviewProcessingQueueId,
        professorProcessingQueueId,
        prodWorkerUrl,
        polyratingsCIPassword,
        polyratingsCIUsername,
        prodProfessorData,
        KVWrapper,
    };

    // Make sure all keys are defined
    for (const [k, v] of Object.entries(out)) {
        if (!v) {
            throw new Error(`Could not create cron environment, key:${k} is not defined`);
        }
    }

    return out;
}
