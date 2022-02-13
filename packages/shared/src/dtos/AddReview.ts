import { IsBoolean, IsDefined, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { DEPARTMENT_LIST } from '../constants';
import { BaseDTO } from './BaseDTO';
import { CourseType, Grade, GradeLevel } from '../interfaces';
import { ExposeFrontend } from '../decorators';
import { plainToInstance } from 'class-transformer';

export class NewReviewBase {
    @IsDefined()
    gradeLevel: GradeLevel;

    @IsDefined()
    grade: Grade;

    @IsDefined()
    courseType: CourseType;

    @IsInt()
    @Min(100)
    @Max(599)
    courseNum: number;

    @IsIn(DEPARTMENT_LIST)
    department: string;

    @IsInt()
    @Min(0)
    @Max(4)
    overallRating: number;

    @IsInt()
    @Min(0)
    @Max(4)
    presentsMaterialClearly: number;

    @IsInt()
    @Min(0)
    @Max(4)
    recognizesStudentDifficulties: number;

    @MinLength(20)
    rating: string;
}

/**
 * The expected content of a POST request to `POST /professors/:id/ratings`
 */
export class AddReviewRequest extends NewReviewBase {
    @IsUUID()
    professor: string;
}

export class AddReviewResponse extends BaseDTO {
    @ExposeFrontend()
    @IsBoolean()
    success: boolean

    @ExposeFrontend()
    @IsString()
    statusMessage: string

    @IsOptional()
    @IsString()
    @ExposeFrontend()
    newReviewId?: string

    static new(success:boolean, statusMessage:string, newReviewId?:string):AddReviewResponse {
        return plainToInstance(AddReviewResponse, {success, statusMessage, newReviewId})
    }
}