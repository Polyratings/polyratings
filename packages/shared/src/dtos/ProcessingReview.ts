import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ExposeFrontend } from '../decorators';
import { BaseDTO } from './BaseDTO';

export class ProcessingReviewResponse extends BaseDTO {
    @IsBoolean()
    @ExposeFrontend()
    success: boolean

    @IsOptional()
    @IsString()
    @ExposeFrontend()
    message?: string

    static new(success: boolean, message?: string):ProcessingReviewResponse {
        return plainToInstance(ProcessingReviewResponse, { success, message })
    }
}