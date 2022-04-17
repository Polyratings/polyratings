import { BulkKey, cloudflareNamespaceInformation } from "@polyratings/client";
import { CronEnv, KvName } from "../entry";
import { Logger } from "../logger";

export function syncKvStore(bulkKey: BulkKey, kvName: KvName, excludeKeys?: Set<string>) {
    return async (env: CronEnv) => {
        Logger.info(`Getting Prod ${bulkKey}`);
        const prodData = await env.authenticatedProductionClient.admin.bulkKvRecord<unknown>(
            bulkKey,
        );

        const betaKv = new env.KVWrapper(cloudflareNamespaceInformation[kvName].beta);
        const devKv = new env.KVWrapper(cloudflareNamespaceInformation[kvName].dev);

        Logger.info(`Removing ${bulkKey} from beta`);
        const betaKeys = (await betaKv.getAllKeys()).filter((key) => !excludeKeys?.has(key));
        await betaKv.deleteValues(betaKeys);

        Logger.info(`Removing ${bulkKey} from dev`);
        const devKeys = (await devKv.getAllKeys()).filter((key) => !excludeKeys?.has(key));
        await devKv.deleteValues(devKeys);

        const pairs = Object.entries(prodData).map(([key, value]) => ({
            key,
            value: JSON.stringify(value),
        }));

        Logger.info(`Putting ${bulkKey} in beta`);
        await betaKv.putValues(pairs);

        Logger.info(`Putting ${bulkKey} in dev`);
        await devKv.putValues(pairs);
    };
}
