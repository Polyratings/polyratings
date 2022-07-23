export const DEV_ENV = {
    url: "https://api-dev.polyratings.org",
};
export const BETA_ENV = {
    url: "https://api-beta.polyratings.org",
};
export const PROD_ENV = {
    url: "https://api-prod.polyratings.org",
};

// interface AppConfiguration {
//     clientEnv: PolyratingsAPIEnv;
//     base: string;
// }

const devConfig = {
    clientEnv: DEV_ENV,
    base: "/",
};

const prodConfig = {
    clientEnv: PROD_ENV,
    base: "/",
};

const betaConfig = {
    clientEnv: BETA_ENV,
    base: "/",
};

const liveConfig = window.location.href.includes("beta.") ? betaConfig : prodConfig;

export const config = process.env.NODE_ENV === "development" ? devConfig : liveConfig;
