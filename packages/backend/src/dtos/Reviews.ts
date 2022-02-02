import { GradeLevel, Grade, CourseType, Review, BaseDTO } from '@polyratings/shared';
import { IsDate, IsDefined, IsInt, IsUUID, Max, Min, MinLength } from 'class-validator';
import { Expose, Type } from 'class-transformer';

export class ReviewDTO extends BaseDTO implements Review {
    @IsUUID()
    id: string;

    @IsUUID()
    professor: string;

    @Expose()
    @IsDefined()
    grade: Grade;

    @Expose()
    @IsDefined()
    gradeLevel: GradeLevel;

    @Expose()
    @IsDefined()
    courseType: CourseType;

    @Expose()
    @IsDate()
    @Type(() => Date)
    postDate: Date;

    @Expose()
    @IsInt()
    @Min(0)
    @Max(4)
    overallRating?: number;

    @Expose()
    @IsInt()
    @Min(0)
    @Max(4)
    presentsMaterialClearly?: number;

    @Expose()
    @IsInt()
    @Min(0)
    @Max(4)
    recognizesStudentDifficulties?: number;

    @Expose()
    @MinLength(20)
    rating: string;
}
