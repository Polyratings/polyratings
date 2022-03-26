import { Client, PolyratingsHttpError, UserToken } from "@polyratings/client";
import jwtDecode from "jwt-decode";
import { BasicBehaviorSubject } from "@/utils";
import { StorageService } from "./storage.service";

export const USER_TOKEN_CACHE_KEY = "user";

// 2h token expiry
const USER_TOKEN_EXPIRY_TIME = 1000 * 60 * 60 * 2;

export class AuthService {
    public user$ = new BasicBehaviorSubject<null | UserToken>(null);

    constructor(private client: Client, private storageService: StorageService) {
        this.client.setErrorInterceptor(this.httpErrorInterceptor);
        storageService.getItem<string>(USER_TOKEN_CACHE_KEY).then((jwtCacheEntry) => {
            if (jwtCacheEntry) {
                this.client.auth.setJwt(jwtCacheEntry.data);
                const user = jwtDecode(jwtCacheEntry.data) as UserToken;
                this.user$.next(user);
            }
        });
    }

    private httpErrorInterceptor(error: PolyratingsHttpError) {
        if (error.httpStatus === 401) {
            // TODO: Find a way to do this cleaner
            this.signOut();
            const LOGIN_ROUTE = "/login";
            if (window.location.pathname !== LOGIN_ROUTE) {
                window.location.replace(LOGIN_ROUTE);
            }
        }
    }

    public getUser(): UserToken | null {
        const jwt = this.client.auth.getJwt();
        return jwt ? jwtDecode(jwt) : null;
    }

    public async login(username: string, password: string): Promise<UserToken> {
        const loginResponse = await this.client.auth.login({ username, password });
        // No need to await since this will only be used next time the application is started
        this.storageService.setItem(
            USER_TOKEN_CACHE_KEY,
            loginResponse.accessToken,
            USER_TOKEN_EXPIRY_TIME,
        );

        const user = jwtDecode(loginResponse.accessToken) as UserToken;
        this.user$.next(user);
        return user;
    }

    public signOut() {
        this.user$.next(null);
        this.storageService.removeItem(USER_TOKEN_CACHE_KEY);
        this.client.auth.signOut();
    }
}
