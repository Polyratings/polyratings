import { IsString } from "class-validator";
import { BaseDTO } from ".";

export class LoginRequest extends BaseDTO {
    @IsString()
    username: string;

    @IsString()
    password: string;
}
