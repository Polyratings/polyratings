interface AppConfiguration {
    remoteUrl:string
}

const devConfig:AppConfiguration = {
    remoteUrl:'http://localhost:8080/api'
}

const prodConfig:AppConfiguration = {
    remoteUrl:'/api'
}

export const config = process.env.NODE_ENV === 'development' ? devConfig : prodConfig; 