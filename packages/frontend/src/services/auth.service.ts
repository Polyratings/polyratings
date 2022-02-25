import { BehaviorSubject } from "rxjs";
import { AuthResponse, UserToken } from "@polyratings/shared";
import jwtDecode from "jwt-decode";
import { config } from "@/App.config";

const USER_LOCAL_STORAGE_KEY = "user";

export class AuthService {
    private jwtToken: string | null = null;

    public isAuthenticatedSubject = new BehaviorSubject<null | UserToken>(null);

    constructor(private storage: Storage, private fetch: typeof window.fetch) {
        const jwt = storage.getItem(USER_LOCAL_STORAGE_KEY) as string | null;
        if (jwt) {
            this.setAuthState(jwt);
        }
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
            this.storage.setItem(USER_LOCAL_STORAGE_KEY, jwtToken);
        } else {
            this.storage.removeItem(USER_LOCAL_STORAGE_KEY);
        }
        return user;
    }
}
