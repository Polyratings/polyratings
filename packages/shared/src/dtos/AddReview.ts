import { Allow, IsDefined, IsIn, IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';
import { DEPARTMENT_LIST } from '../constants';
import { BaseDTO } from './BaseDTO';
import { CourseType, Grade, GradeLevel } from '../interfaces';
import { Expose } from 'class-transformer';

/**
 * The expected content of a POST request to `POST /professors/:id/ratings`
 */
export class AddReviewRequest extends BaseDTO {
    @IsUUID()
    @IsDefined()
    @Allow()
    professor: string;

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

    @IsNotEmpty()
    rating: string;
}

export class AddReviewResponse extends BaseDTO {
    @Expose()
    success: boolean;
    @Expose()
    statusMessage: string;
    @Expose()
    newReviewId?: string;
}