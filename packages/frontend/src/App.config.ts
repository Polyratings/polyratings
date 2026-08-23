import {
    BETA_ENV,
    DEV_ENV,
    LOCAL_ENV,
    PolyratingsAPIEnv,
    PROD_ENV,
} from "@backend/generated/tomlGenerated";

interface AppConfiguration {
    clientEnv: PolyratingsAPIEnv;
    base: string;
}

const localConfig: AppConfiguration = {
    clientEnv: LOCAL_ENV,
    base: "/",
};

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

const modeToConfig: Record<string, AppConfiguration> = {
    master: prodConfig,
    beta: betaConfig,
    dev: devConfig,
    fallback: devConfig,
};

const deploymentMode = import.meta.env.MODE ?? "fallback";
const viteApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

// eslint-disable-next-line import/no-mutable-exports
let config: AppConfiguration;
if (deploymentMode === "local-dev") {
    config = localConfig;
} else if (viteApiUrl) {
    config = { clientEnv: { url: viteApiUrl }, base: "/" };
} else {
    config = modeToConfig[deploymentMode] ?? modeToConfig.fallback;
}

export { config };
