import { DEV_ENV, LOCAL_ENV, PolyratingsAPIEnv } from "@backend/generated/tomlGenerated";

interface AppConfiguration {
    clientEnv: PolyratingsAPIEnv;
    base: string;
}

// Matches API_PREFIX in the backend entry.
const API_PATH = "/api";

function apiEnvForMode(mode: string): PolyratingsAPIEnv {
    const viteApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
    if (viteApiUrl) {
        return { url: viteApiUrl };
    }
    // Deployed builds are served by the backend Worker, so the API is same-origin.
    if (import.meta.env.PROD) {
        return { url: API_PATH };
    }
    if (mode === "local-dev") {
        return { url: `${LOCAL_ENV.url}${API_PATH}` };
    }
    return { url: `${DEV_ENV.url}${API_PATH}` };
}

export const config: AppConfiguration = {
    clientEnv: apiEnvForMode(import.meta.env.MODE ?? "fallback"),
    base: "/",
};
