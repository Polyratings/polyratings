import {
    GradeLevel,
    Grade,
    CourseType,
    Review,
    BaseDTO,
    AddReviewRequest,
    DEPARTMENT_LIST,
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
import { ExcludeFrontend } from '../utils/decorators';

export class ReviewDTO extends BaseDTO implements Review {
    @IsUUID()
    @ExcludeFrontend()
    id: string = crypto.randomUUID();

    @IsUUID()
    @ExcludeFrontend()
    professor: string;

    @IsDefined()
    grade: Grade;

    @IsDefined()
    gradeLevel: GradeLevel;

    @IsDefined()
    courseType: CourseType;

    @IsDate()
    @Type(() => Date)
    postDate: Date = new Date();

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    overallRating?: number;

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    presentsMaterialClearly?: number;

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    recognizesStudentDifficulties?: number;

    @MinLength(20)
    rating: string;

    static fromPendingReview(pendingReview: PendingReviewDTO): ReviewDTO {
        return plainToInstance(ReviewDTO, pendingReview, {
            excludeExtraneousValues: true,
        });
    }
}

export type PendingReviewStatus =
    | 'Queued'
    | 'Processing'
    | 'Successful'
    | 'Failed';

// TODO: Determine why class-transformer/validator is unable to validate/transform this object
// likely because of inheritance, so we may just have to explicitly enumerate all of the fields present
export class PendingReviewDTO extends ReviewDTO {
    // Default state on creation is Queued
    @IsDefined()
    status: PendingReviewStatus = 'Queued';

    @Allow()
    error?: string;

    @Allow()
    sentimentResponse?: object; // TODO: Codify some data shape/structure for this

    @IsInt()
    @Min(100)
    @Max(599)
    courseNum: number;

    @IsIn(DEPARTMENT_LIST)
    department: string;

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    declare overallRating: number;

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    declare presentsMaterialClearly: number;

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    declare recognizesStudentDifficulties: number;

    static fromAddReviewRequest(request: AddReviewRequest): PendingReviewDTO {
        return plainToInstance(PendingReviewDTO, request);
    }
}
