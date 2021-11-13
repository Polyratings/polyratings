interface AppConfiguration {
    remoteUrl:string,
    base:string
}

const devConfig:AppConfiguration = {
    remoteUrl:'https://professor-reviews.atustin.workers.dev',
    base:'/'
}

const prodConfig:AppConfiguration = {
    remoteUrl:'https://professor-reviews.atustin.workers.dev',
    base:'/'
}

const githubPagesConfig:AppConfiguration = {
    remoteUrl:'https://professor-reviews.atustin.workers.dev',
    base:'/polyratings-revamp/'
}

const regularConfig = process.env.NODE_ENV === 'development' ? devConfig : prodConfig; 

export const config = window.location.href.includes('github.io') ? githubPagesConfig : regularConfig