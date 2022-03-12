import { plainToInstance } from "class-transformer";
import { Allow, IsBoolean, IsOptional, IsString } from "class-validator";
import { Teacher } from "../interfaces";
import { ExposeFrontend } from "../decorators";
import { BaseDTO } from "./BaseDTO";

export class ProcessingReviewResponse extends BaseDTO {
    @IsBoolean()
    @ExposeFrontend()
    success: boolean;

    @IsOptional()
    @IsString()
    @ExposeFrontend()
    message?: string;

    @IsOptional()
    @Allow()
    @ExposeFrontend()
    updatedProfessor?: Teacher;

    static new(
        success: boolean,
        message?: string,
        updatedProfessor?: Teacher,
    ): ProcessingReviewResponse {
        return plainToInstance(ProcessingReviewResponse, { success, message, updatedProfessor });
    }
}
