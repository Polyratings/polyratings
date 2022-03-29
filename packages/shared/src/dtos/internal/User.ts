import { IsNotEmpty } from "class-validator";

// Purposely do not extend BaseDto so it can not be returned from the backend
export class User {
    @IsNotEmpty()
    username: string;

    @IsNotEmpty()
    password: string;

    constructor(username: string, hashedPassword: string) {
        this.username = username;
        this.password = hashedPassword;
    }
}
