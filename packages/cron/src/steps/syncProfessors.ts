import { CronEnv } from "../entry";
import { Logger } from "../logger";

export async function syncProfessors(env: CronEnv) {
    const betaProfessorKv = new env.KVWrapper(env.accountId, env.betaProfessorKvId);
    const devProfessorKv = new env.KVWrapper(env.accountId, env.devProfessorKvId);

    Logger.info("Removing professors from beta");
    const betaKeys = await betaProfessorKv.getAllKeys();
    await betaProfessorKv.deleteValues(betaKeys);

    Logger.info("Removing professors from dev");
    const devKeys = await devProfessorKv.getAllKeys();
    await devProfessorKv.deleteValues(devKeys);

    const pairs = env.prodProfessorData.map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
    }));

    Logger.info("Putting professors in beta");
    await betaProfessorKv.putValues(pairs);

    Logger.info("Putting professors in dev");
    await devProfessorKv.putValues(pairs);
}
