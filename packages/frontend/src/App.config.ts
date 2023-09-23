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

const branchToConfig: Record<string, AppConfiguration> = {
    master: prodConfig,
    beta: betaConfig,
};

const cloudflareBranch = import.meta.env?.CF_PAGES_BRANCH ?? "";

// eslint-disable-next-line import/no-mutable-exports
let config: AppConfiguration;
if (import.meta.env.MODE === "local-dev") {
    config = localConfig;
} else if (branchToConfig[cloudflareBranch]) {
    config = branchToConfig[cloudflareBranch];
} else {
    config = devConfig;
}

export { config };
