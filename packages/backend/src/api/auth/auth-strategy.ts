import { UserToken } from '@polyratings/backend/dtos/UserToken';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { UserToken as UserTokenPlain } from '@polyratings/shared';
import { plainToInstance } from 'class-transformer';
import * as jwt from '@tsndr/cloudflare-worker-jwt';
import { User } from '@polyratings/backend/dtos/User';

const UTF8_MAX_BYTES = 4;

export class AuthStrategy {
    private static SALT_SIZE = 10;

    // Should jwtSigningKey be private?
    constructor(public readonly jwtSigningKey: string) {}

    async hashPassword(input: string): Promise<string> {
        const textEncoder = new TextEncoder();
        const textDecoder = new TextDecoder();

        const salt = new Uint8Array(AuthStrategy.SALT_SIZE * UTF8_MAX_BYTES);
        crypto.getRandomValues(salt);

        const saltStr = textDecoder.decode(salt).substr(0, AuthStrategy.SALT_SIZE);
        const combined = saltStr + input;

        const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(combined));

        const hashedPassword = saltStr + textDecoder.decode(hash);
        return hashedPassword;
    }

    async verifyHash(hashedPassword: string, password: string): Promise<boolean> {
        const textEncoder = new TextEncoder();
        const textDecoder = new TextDecoder();

        const salt = hashedPassword.substr(0, AuthStrategy.SALT_SIZE);
        const storedHash = hashedPassword.substr(AuthStrategy.SALT_SIZE);

        const combined = salt + password;

        const computedHash = await crypto.subtle.digest('SHA-256', textEncoder.encode(combined));
        const computedHashStr = textDecoder.decode(computedHash);

        return storedHash === computedHashStr;
    }

    async verify(authHeader: string | null): Promise<UserToken> {
        if (!authHeader) {
            throw new PolyratingsError(401, 'Bad Credentials');
        }

        const token = authHeader.replace('Bearer ', '');
        const isValid = await jwt.verify(token, this.jwtSigningKey);
        if (!isValid) {
            throw new PolyratingsError(401, 'Invalid JWT ' + token);
        }

        // If token is valid payload should be as well
        const payload = jwt.decode(token);

        return plainToInstance(UserToken, payload);
    }

    async createToken(user: User) {
        const { username } = user;
        const payload: UserTokenPlain = {
            sub: username,
            username,
            exp: Math.floor(Date.now() / 1000) + 2 * (60 * 60), // Expires: Now + 2h
        };

        const secret = this.jwtSigningKey;
        return jwt.sign(payload, secret);
    }
}
