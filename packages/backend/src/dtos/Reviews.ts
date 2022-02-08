import {
    GradeLevel,
    Grade,
    CourseType,
    Review,
    BaseDTO,
    AddReviewRequest,
    DEPARTMENT_LIST,
    Default,
    ExcludeFrontend,
    ExposeFrontend,
} from '@polyratings/shared';
import {
    Allow,
    IsDate,
    IsDefined,
    IsIn,
    IsInt,
    IsUUID,
    Max,
    Min,
    MinLength,
} from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';

export class ReviewDTO extends BaseDTO implements Review {
    @IsUUID()
    @ExcludeFrontend()
    @Default(() => crypto.randomUUID())
    id: string;

    @IsUUID()
    @ExcludeFrontend()
    professor: string;

    @IsDefined()
    @ExposeFrontend()
    grade: Grade;

    @IsDefined()
    @ExposeFrontend()
    gradeLevel: GradeLevel;

    @IsDefined()
    @ExposeFrontend()
    courseType: CourseType;

    @IsDate()
    @Type(() => Date)
    @Default(() => new Date())
    @ExposeFrontend()
    postDate: Date = new Date();

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    overallRating: number;

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    presentsMaterialClearly: number;

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    recognizesStudentDifficulties: number;

    @MinLength(20)
    @ExposeFrontend()
    rating: string;
}

export type PendingReviewStatus = 'Queued' | 'Processing' | 'Successful' | 'Failed';

// TODO: Determine why class-transformer/validator is unable to validate/transform this object
// likely because of inheritance, so we may just have to explicitly enumerate all of the fields present
export class PendingReviewDTO extends ReviewDTO {
    // Default state on creation is Queued
    @Allow()
    @ExcludeFrontend()
    @Default(() => 'Queued')
    status: PendingReviewStatus;

    @Allow()
    @ExposeFrontend()
    error?: string;

    @Allow()
    @ExposeFrontend()
    sentimentResponse?: object; // TODO: Codify some data shape/structure for this

    @IsInt()
    @Min(100)
    @Max(599)
    @ExposeFrontend()
    courseNum: number;

    @IsIn(DEPARTMENT_LIST)
    @ExposeFrontend()
    department: string;

    static fromAddReviewRequest(request: AddReviewRequest): PendingReviewDTO {
        return plainToInstance(PendingReviewDTO, request);
    }

    toReviewDTO(): ReviewDTO {
        return plainToInstance(ReviewDTO, this, {
            excludeExtraneousValues: true,
        });
    }
}
