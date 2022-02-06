import { IsString } from "class-validator";
import { BaseDTO } from "../dtos/BaseDTO";

export class LoginRequest extends BaseDTO {
    @IsString()
    username:string

    @IsString()
    password:string
}