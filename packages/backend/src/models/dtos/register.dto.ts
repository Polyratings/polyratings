import { IsEmail, IsNotEmpty } from "class-validator";

export class Register {
    @IsEmail()
    email:string

    @IsNotEmpty()
    password:string
}