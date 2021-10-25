import { AuthService } from "./auth.service";

export class HttpService {
    constructor(
        private authService:AuthService
    ){}

    async fetch(input: string, init?: RequestInit | undefined):Promise<Response> {
        init = init || {}
        init.headers = init.headers || {}
        const jwt = this.authService.getJwt()
        if(jwt) {
            // @ts-expect-error error since can't normally index header object. The way that its going to be used will be fine though
            init.headers['Authorization'] = `Bearer ${jwt}`
        }
        const res = await window.fetch(input, init)
        if(res.status == 401) {
            // TODO: Find a way to do this cleaner
            this.authService.signOut()
            const LOGIN_ROUTE = '/login'
            if(window.location.pathname != LOGIN_ROUTE) {
                window.location.replace(LOGIN_ROUTE)
            }
        }
        return res
    }
    
}