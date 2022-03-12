import { UserToken as UserTokenPlain } from "../interfaces";

// Purposely do not extend BaseDto so it can not be returned from the backend
export class UserToken implements UserTokenPlain {
    username: string;

    sub: string;

    exp: number;
}
