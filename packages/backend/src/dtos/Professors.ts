import { IsDefined, IsIn, IsInt, IsNotEmpty, IsUUID, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDTO, GradeLevel, Grade, CourseType, DEPARTMENT_LIST, Teacher, Review as SharedReview, ProfessorList } from '@polyratings/shared';

class Review implements SharedReview {
    professor: string;
    gradeLevel: GradeLevel;
    grade: Grade;
    courseType: CourseType;
    postDate: Date;
    rating: string;
}

export class ProfessorListDTO extends BaseDTO implements ProfessorList {

    constructor() {
        super();
    }

    @Type(() => TruncatedProfessorDTO)
    professors: TruncatedProfessorDTO[];
}

export class TruncatedProfessorDTO extends BaseDTO {
    @IsIn(DEPARTMENT_LIST)
    department: string;
    @IsDefined()
    firstName: string;
    @IsDefined()
    lastName: string;
    @IsInt()
    @Min(0)
    numEvals: number;
    @IsUUID()
    id: string;
    @Min(0)
    @Max(4)
    overallRating: number;
    @Min(0)
    @Max(4)
    materialClear: number;
    @Min(0)
    @Max(4)
    studentDifficulties: number;
    @MinLength(1)
    courses: string[];
}

export class ProfessorDTO extends BaseDTO implements Teacher {
    @IsUUID()
    id: string;
    @IsNotEmpty()
    firstName: string;
    @IsNotEmpty()
    lastName: string;
    @IsIn(DEPARTMENT_LIST)
    department: string;
    @IsInt()
    @Min(0)
    numEvals: number;
    @IsInt()
    @Min(0)
    @Max(4)
    overallRating: number;
    @IsInt()
    @Min(0)
    @Max(4)
    materialClear: number;
    @IsInt()
    @Min(0)
    @Max(4)
    studentDifficulties: number;
    @IsDefined()
    courses: string[];
    @ValidateNested()
    @Type(() => Review)
    reviews: Record<string, SharedReview[]>;
}