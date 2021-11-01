const productionConfig = {
    frontendUrl:'https://polratings-revamp-alcr3.ondigitalocean.app'
}

const devConfig = {
    frontendUrl:'http://localhost:3000'
}

export const config = () => process.env.NODE_ENV === 'production' ? productionConfig : devConfig