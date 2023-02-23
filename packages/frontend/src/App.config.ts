import { BETA_ENV, DEV_ENV, PolyratingsAPIEnv, PROD_ENV } from "@backend/generated/tomlGenerated";

interface AppConfiguration {
    clientEnv: PolyratingsAPIEnv;
    base: string;
}

const devConfig: AppConfiguration = {
    clientEnv: DEV_ENV,
    base: "/",
};

const prodConfig: AppConfiguration = {
    clientEnv: PROD_ENV,
    base: "/",
};

const betaConfig: AppConfiguration = {
    clientEnv: BETA_ENV,
    base: "/",
};

const liveConfig = globalThis.location?.href?.includes("beta.") ? betaConfig : prodConfig;

export const config = process.env.NODE_ENV === "development" ? devConfig : liveConfig;
