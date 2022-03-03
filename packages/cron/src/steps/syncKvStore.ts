import { BulkKey, Teacher } from "@polyratings/shared";
import { CronEnv, KvName } from "../entry";
import { Logger } from "../logger";

export function syncKvStore(bulkKey: BulkKey, kvName: KvName) {
    return async (env: CronEnv) => {
        Logger.info(`Getting Prod ${bulkKey}`);
        const prodData = await env.prodWorker.bulkEntries<Teacher>(bulkKey);

        const betaKv = new env.KVWrapper(env.getKvId("beta", kvName));
        const devKv = new env.KVWrapper(env.getKvId("dev", kvName));

        Logger.info(`Removing ${bulkKey} from beta`);
        const betaKeys = await betaKv.getAllKeys();
        await betaKv.deleteValues(betaKeys);

        Logger.info(`Removing ${bulkKey} from dev`);
        const devKeys = await devKv.getAllKeys();
        await devKv.deleteValues(devKeys);

        const pairs = prodData.map(([key, value]) => ({
            key,
            value: JSON.stringify(value),
        }));

        Logger.info(`Putting ${bulkKey} in beta`);
        await betaKv.putValues(pairs);

        Logger.info(`Putting ${bulkKey} in dev`);
        await devKv.putValues(pairs);
    };
}
