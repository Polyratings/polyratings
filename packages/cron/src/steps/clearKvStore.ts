import { CronEnv, KvName } from "../entry";
import { Logger } from "../logger";

export function clearKvStore(kvName: KvName) {
    return async (env: CronEnv) => {
        Logger.info(`Removing all in ${kvName} in prod`);
        const prodKv = new env.KVWrapper(env.getKvId("prod", kvName));
        const prodKeys = await prodKv.getAllKeys();
        await prodKv.deleteValues(prodKeys);

        Logger.info(`Removing all in ${kvName} in beta`);
        const betaKv = new env.KVWrapper(env.getKvId("beta", kvName));
        const betaKeys = await betaKv.getAllKeys();
        await betaKv.deleteValues(betaKeys);

        Logger.info(`Removing all in ${kvName} in dev`);
        const devKv = new env.KVWrapper(env.getKvId("dev", kvName));
        const devKeys = await devKv.getAllKeys();
        await devKv.deleteValues(devKeys);
    };
}
