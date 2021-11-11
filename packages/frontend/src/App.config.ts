interface AppConfiguration {
    remoteUrl:string,
    base:string
}

const devConfig:AppConfiguration = {
    remoteUrl:'http://localhost:8080/api',
    base:'/'
}

const prodConfig:AppConfiguration = {
    remoteUrl:'/api',
    base:'/'
}

const githubPagesConfig:AppConfiguration = {
    remoteUrl:'https://polratings-revamp-alcr3.ondigitalocean.app/api',
    base:'/polyratings-revamp/'
}

const regularConfig = process.env.NODE_ENV === 'development' ? devConfig : prodConfig; 

export const config = window.location.href.includes('github.io') ? githubPagesConfig : regularConfig