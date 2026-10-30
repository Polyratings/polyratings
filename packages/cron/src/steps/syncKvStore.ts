import { BulkKey } from "@backend/utils/const";
import { cloudflareNamespaceInformation } from "@backend/generated/tomlGenerated";
import { bulkRecord } from "../utils/bulkRecord";
import { CronEnv, KvName } from "../entry";
import { Logger } from "../logger";

type SyncKvStoreOptions = {
    excludeKeys?: Set<string>;
    /** Prod values are written to beta either way. Dev is cleared, then written only when this is true. */
    copyToDev?: boolean;
};

export function syncKvStore(bulkKey: BulkKey, kvName: KvName, options?: SyncKvStoreOptions) {
    const excludeKeys = options?.excludeKeys;
    const copyToDev = options?.copyToDev ?? true;

    return async (env: CronEnv) => {
        Logger.info(`Getting Prod ${bulkKey}`);
        const prodData = await bulkRecord(env.authenticatedProductionClient, bulkKey);

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

        if (copyToDev) {
            Logger.info(`Putting ${bulkKey} in dev`);
            await devKv.putValues(pairs);
        } else {
            Logger.info(`Leaving ${bulkKey} empty in dev`);
        }
    };
}
