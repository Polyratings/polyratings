interface AppConfiguration {
    remoteUrl: string;
    base: string;
}

const devConfig: AppConfiguration = {
    remoteUrl: "https://api-dev.polyratings.dev",
    base: "/",
};

const prodConfig: AppConfiguration = {
    remoteUrl: "https://api-beta.polyratings.dev",
    base: "/",
};

const betaConfig: AppConfiguration = {
    remoteUrl: "https://api-prod.polyratings.dev",
    base: "/",
};

const liveConfig = window.location.href.includes("beta.") ? betaConfig : prodConfig;

export const config = process.env.NODE_ENV === "development" ? devConfig : liveConfig;
