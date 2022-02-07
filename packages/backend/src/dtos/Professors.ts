import { Allow, IsDefined, IsIn, IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import { BaseDTO, GradeLevel, Grade, CourseType, DEPARTMENT_LIST, Teacher, Review as SharedReview } from '@polyratings/shared';
import { ExcludeFrontend } from '../utils/decorators';

class Review extends BaseDTO implements SharedReview {
    @IsUUID()
    @ExcludeFrontend()
    id:string

    @IsUUID()
    @ExcludeFrontend()
    professor: string;

    gradeLevel: GradeLevel;

    grade: Grade;

    courseType: CourseType;

    postDate: Date;

    rating: string;
}

export class TruncatedProfessorDTO extends BaseDTO implements Teacher {
    @IsUUID()
    id: string;

    @IsIn(DEPARTMENT_LIST)
    department: string;

    @IsNotEmpty()
    firstName: string;

    @IsNotEmpty()
    lastName: string;

    @IsInt()
    @Min(0)
    numEvals: number;

    @Min(0)
    @Max(4)
    overallRating: number;

    @Min(0)
    @Max(4)
    materialClear: number;

    @Min(0)
    @Max(4)
    studentDifficulties: number;

    // @IsValidCourse({ each: true })
    @Allow()
    courses: string[];
}

export class ProfessorDTO extends TruncatedProfessorDTO {
    @Allow()
    @Transform(({value, options}) => {
        Object.entries(value).forEach(([course, reviews]) => {
            value[course] = plainToInstance(Review, reviews, options)
        })
        return value
    })
    reviews: Record<string, Review[]>;
}
