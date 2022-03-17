import { BehaviorSubject } from "rxjs";
import { AuthResponse, UserToken } from "@polyratings/client";
import jwtDecode from "jwt-decode";
import { config } from "@/App.config";
import { StorageService } from "./storage.service";

export const USER_TOKEN_CACHE_KEY = "user";

// 2h token expiry
const USER_TOKEN_EXPIRY_TIME = 1000 * 60 * 60 * 2;

export class AuthService {
    private jwtToken: string | null = null;

    public isAuthenticatedSubject = new BehaviorSubject<null | UserToken>(null);

    constructor(private storageService: StorageService, private fetch: typeof window.fetch) {
        storageService.getItem<string>(USER_TOKEN_CACHE_KEY).then((jwtCacheEntry) => {
            if (jwtCacheEntry) {
                this.setAuthState(jwtCacheEntry.data);
            }
        });
    }

    public getJwt(): string | null {
        return this.jwtToken;
    }

    public getUser(): UserToken | null {
        return this.jwtToken ? jwtDecode(this.jwtToken) : null;
    }

    public async login(username: string, password: string): Promise<UserToken> {
        const loginRes = await this.fetch(`${config.remoteUrl}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        if (loginRes.status >= 300) {
            const errorPayload = await loginRes.json();
            throw errorPayload.message;
        }

        const loginBody = (await loginRes.json()) as AuthResponse;
        const jwt = loginBody.accessToken;

        // We know that this is a valid user since we just got a jwt
        return this.setAuthState(jwt) as UserToken;
    }

    public signOut() {
        this.setAuthState(null);
    }

    private setAuthState(jwtToken: string | null): UserToken | null {
        this.jwtToken = jwtToken;
        const user = this.getUser();
        this.isAuthenticatedSubject.next(user);
        if (jwtToken) {
            this.storageService.setItem(USER_TOKEN_CACHE_KEY, jwtToken, USER_TOKEN_EXPIRY_TIME);
        } else {
            this.storageService.removeItem(USER_TOKEN_CACHE_KEY);
        }
        return user;
    }
}
