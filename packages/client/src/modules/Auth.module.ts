import { AuthResponse, LoginRequest } from "@polyratings/shared";
import { HttpModule } from ".";

export class AuthModule {
    constructor(private httpModule: HttpModule) {}

    /**
     * Logs a user into the client library. If login does not throw it has been successful
     */
    async login(credentials: LoginRequest): Promise<void> {
        const loginRes = await this.httpModule.fetch("/login", {
            method: "POST",
            body: JSON.stringify(credentials),
        });

        const loginBody = (await loginRes.json()) as AuthResponse;

        this.httpModule.setAuthToken(loginBody.accessToken);
    }

    /**
     * Registers a new admin user. Requires an existing logged in user
     */
    async register(newUser: LoginRequest): Promise<void> {
        await this.httpModule.fetch("/register", {
            method: "POST",
            body: JSON.stringify(newUser),
        });
    }

    setJwt(token: string) {
        this.httpModule.setAuthToken(token);
    }
}
