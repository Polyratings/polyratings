import { AuthResponse } from "@polyratings/shared";
import { HttpModule } from ".";

export class AuthModule {
    constructor(private httpModule: HttpModule) {}

    /**
     * Logs a user into the client library. If login does not throw it has been successful
     */
    async login(credentials: Credentials): Promise<void> {
        const loginRes = await this.httpModule.fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(credentials),
        });

        const loginBody = (await loginRes.json()) as AuthResponse;

        this.httpModule.setAuthToken(loginBody.accessToken);
    }

    /**
     * Registers a new admin user. Requires an existing logged in user
     */
    async register(newUser: Credentials): Promise<void> {
        await this.httpModule.fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(newUser),
        });
    }
}

export interface Credentials {
    username: string;
    password: string;
}
