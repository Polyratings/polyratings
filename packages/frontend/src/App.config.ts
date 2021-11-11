interface AppConfiguration {
    remoteUrl:string
}

const devConfig:AppConfiguration = {
    remoteUrl:'http://localhost:8080/api'
}

const prodConfig:AppConfiguration = {
    remoteUrl:'/api'
}

const githubPagesConfig:AppConfiguration = {
    remoteUrl:'https://polratings-revamp-alcr3.ondigitalocean.app/api'
}

const regularConfig = process.env.NODE_ENV === 'development' ? devConfig : prodConfig; 

export const config = window.location.href.includes('github.io') ? githubPagesConfig : regularConfig