interface AppConfiguration {
    remoteUrl: string;
    base: string;
}

const devConfig: AppConfiguration = {
    remoteUrl: 'https:///sunder-backend.addison-polyratings.workers.dev',
    base: '/',
};

const prodConfig: AppConfiguration = {
    remoteUrl: 'https://api-beta.polyratings.dev',
    base: '/',
};

const githubPagesConfig: AppConfiguration = {
    remoteUrl: 'https://api-beta.polyratings.dev',
    base: '/polyratings-revamp/',
};

const regularConfig = process.env.NODE_ENV === 'development' ? devConfig : prodConfig;

export const config = window.location.href.includes('github.io')
    ? githubPagesConfig
    : regularConfig;
