import { CronEnv } from "../entry";
import { Logger } from "../logger";

export async function clearProcessingQueues(env: CronEnv) {
    const reviewProcessingKv = new env.KVWrapper(env.accountId, env.reviewProcessingQueueId);
    const professorProcessingKv = new env.KVWrapper(env.accountId, env.professorProcessingQueueId);

    Logger.info("Removing all entries in review processing queue");
    const betaKeys = await reviewProcessingKv.getAllKeys();
    await reviewProcessingKv.deleteValues(betaKeys);

    Logger.info("Removing all entries in review processing queue");
    const devKeys = await professorProcessingKv.getAllKeys();
    await professorProcessingKv.deleteValues(devKeys);
}
