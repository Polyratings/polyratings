/* eslint-disable class-methods-use-this */
import * as jwt from "@tsndr/cloudflare-worker-jwt";
import { User } from "@polyratings/backend/types/schema";

const HEX_BYTES_PER_CHAR = 2;

export class AuthStrategy {
    private static SALT_SIZE = 32;

    // Should jwtSigningKey be private?
    constructor(public readonly jwtSigningKey: string) {}

    async hashPassword(input: string): Promise<string> {
        const textEncoder = new TextEncoder();

        const salt = new Uint8Array(AuthStrategy.SALT_SIZE / HEX_BYTES_PER_CHAR);
        crypto.getRandomValues(salt);

        const saltStr = this.toHexString(salt);
        const combined = saltStr + input;

        const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(combined));

        const hashedPassword = saltStr + this.toHexString(new Uint8Array(hash));
        return hashedPassword;
    }

    async verifyHash(hashedPassword: string, password: string): Promise<boolean> {
        const textEncoder = new TextEncoder();

        const salt = hashedPassword.substr(0, AuthStrategy.SALT_SIZE);
        const storedHash = hashedPassword.substr(AuthStrategy.SALT_SIZE);

        const combined = salt + password;

        const computedHash = await crypto.subtle.digest("SHA-256", textEncoder.encode(combined));
        const computedHashStr = this.toHexString(new Uint8Array(computedHash));

        return storedHash === computedHashStr;
    }

    async verify(authHeader: string | null): Promise<UserToken | undefined> {
        if (!authHeader) {
            return undefined;
        }

        const token = authHeader.replace("Bearer ", "");
        const isValid = await jwt.verify(token, this.jwtSigningKey);
        if (!isValid) {
            return undefined;
        }

        // If token is valid payload should be as well
        const payload = jwt.decode(token);

        return payload as UserToken;
    }

    async createToken(user: User) {
        const { username } = user;
        const payload: UserToken = {
            sub: username,
            username,
            exp: Math.floor(Date.now() / 1000) + 2 * (60 * 60), // Expires: Now + 2h
        };

        const secret = this.jwtSigningKey;
        return jwt.sign(payload, secret);
    }

    // From: https://stackoverflow.com/questions/34309988/byte-array-to-hex-string-conversion-in-javascript
    private toHexString(byteArray: Uint8Array): string {
        return Array.from(byteArray, (byte) => `0${(byte & 0xff).toString(16)}`.slice(-2)).join("");
    }
}

export type UserToken = {
    sub: string;
    username: string;
    exp: number;
};
