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

function apiEnvForMode(mode: string): PolyratingsAPIEnv {
    const viteApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
    if (viteApiUrl) {
        return { url: viteApiUrl };
    }
    if (mode === "local-dev") {
        return LOCAL_ENV;
    }
    if (mode === "master" || mode === "production") {
        return PROD_ENV;
    }
    if (mode === "beta") {
        return BETA_ENV;
    }
    return DEV_ENV;
}

export const config: AppConfiguration = {
    clientEnv: apiEnvForMode(import.meta.env.MODE ?? "fallback"),
    base: "/",
};
