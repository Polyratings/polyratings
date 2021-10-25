import { BehaviorSubject } from "rxjs"
import { config } from "../App.config"
import { JwtAuthResponse } from "../models/JwtAuthResponse"

const USER_LOCAL_STORAGE_KEY = 'user'

export class AuthService {

    private jwtToken:string | null = null
    public isAuthenticatedSubject = new BehaviorSubject(false)

    constructor(private storage:Storage) {
        const jwt = storage.getItem(USER_LOCAL_STORAGE_KEY) as string | null
        if(jwt) {
            this.setAuthState(jwt)
        }
    }

    public getJwt(): string | null {
        return this.jwtToken
    }

    public async login(calPolyUsername:string, password:string) {
        const loginRes = await fetch(
            `${config.remoteUrl}/auth/login`,
            {
                method:'POST', 
                headers:{
                    'Content-Type':'application/json'
                },
                body:JSON.stringify({email:`${calPolyUsername}@calpoly.edu`, password})
            }
        )
        if(loginRes.status != 200 && loginRes.status != 201) {
            const error = await loginRes.json()
            throw error.message
        }
        const loginBody = await loginRes.json() as JwtAuthResponse
        const jwt = loginBody.access_token as string

        this.setAuthState(jwt)
    }

    public async register(calPolyUsername:string, password:string) {
        const registerRes = await fetch(
            `${config.remoteUrl}/auth/register`,
            {
                method:'POST', 
                headers:{
                    'Content-Type':'application/json'
                },
                body:JSON.stringify({email:`${calPolyUsername}@calpoly.edu`, password})
            }
        )
        if(registerRes.status != 200 && registerRes.status != 201) {
            const error = await registerRes.json()
            throw error.message
        }
    }

    public async confirmEmail(userID:string, otp:string) {
        const confirmEmailRequest = await fetch(`${config.remoteUrl}/auth/confirmEmail/${userID}/${otp}`)
        if(confirmEmailRequest.status != 200 && confirmEmailRequest.status != 201) {
            const error = await confirmEmailRequest.json()
            throw error.message
        }
        const confirmEmailBody = await confirmEmailRequest.json() as JwtAuthResponse
        const jwt = confirmEmailBody.access_token
        this.setAuthState(jwt)
    }

    public signOut() {
        this.setAuthState(null)
    }

    private setAuthState(jwtToken:string | null) {
        this.jwtToken = jwtToken
        this.isAuthenticatedSubject.next(!!jwtToken)
        if(jwtToken) {
            this.storage.setItem(USER_LOCAL_STORAGE_KEY, jwtToken)
        } else {
            this.storage.removeItem(USER_LOCAL_STORAGE_KEY)
        }
    }
}