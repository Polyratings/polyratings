import { plainToInstance } from "class-transformer";
import { IsString } from "class-validator";
import { ExposeFrontend, BaseDTO } from "@/index";

export class AuthResponse extends BaseDTO {
    @ExposeFrontend()
    @IsString()
    accessToken: string;

    static new(accessToken: string): AuthResponse {
        return plainToInstance(AuthResponse, { accessToken });
    }
}
