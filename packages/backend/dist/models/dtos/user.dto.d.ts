import { AuthService } from "src/auth/auth.service";
import { UserEntity } from "../entities/user.entity";
import { User } from "@polyratings-revamp/shared";
export declare class UserDto implements User {
    readonly sub: number;
    readonly email: string;
    readonly isAdmin: boolean;
    constructor({ sub, email, isAdmin }: User);
    toEntity(authService: AuthService): Promise<UserEntity>;
}
