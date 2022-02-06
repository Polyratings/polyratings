import { GradeLevel, Grade, CourseType, Review, BaseDTO, AddReviewRequest } from '@polyratings/shared';
import { Allow, IsDate, IsDefined, IsIn, IsInt, IsUUID, Max, Min, MinLength } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { DEPARTMENT_LIST } from '../../../shared';

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

    static fromPendingReview(pendingReview: PendingReviewDTO): ReviewDTO {
        const ret = new ReviewDTO();

        ret.id = pendingReview.id;
        ret.professor = pendingReview.professor;
        ret.grade = pendingReview.grade;
        ret.gradeLevel = pendingReview.gradeLevel;
        ret.courseType = pendingReview.courseType;
        ret.postDate = pendingReview.postDate;
        ret.overallRating = pendingReview.overallRating;
        ret.presentsMaterialClearly = pendingReview.presentsMaterialClearly;
        ret.recognizesStudentDifficulties = pendingReview.recognizesStudentDifficulties;
        ret.rating = pendingReview.rating;

        return ret;
    }
}

export type PendingReviewStatus = "Queued" | "Processing" | "Successful" | "Failed";


// TODO: Determine why class-transformer/validator is unable to validate/transform this object
// likely because of inheritance, so we may just have to explicitly enumerate all of the fields present
export class PendingReviewDTO {
    @IsUUID()
    id: string;

    @IsUUID()
    professor: string;

    @IsDefined()
    grade: Grade;

    @IsDefined()
    gradeLevel: GradeLevel;

    @IsDefined()
    courseType: CourseType;

    @IsDate()
    @Type(() => Date)
    postDate: Date;

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

    @IsInt()
    @Min(100)
    @Max(599)
    courseNum: number;

    @IsIn(DEPARTMENT_LIST)
    department: string;

    @MinLength(20)
    rating: string;

    @IsDefined()
    status: PendingReviewStatus;

    @Allow()
    error?: string;

    @Allow()
    sentimentResponse?: object // TODO: Codify some data shape/structure for this

    static fromAddReviewRequest(request: AddReviewRequest, id: string): PendingReviewDTO {
        const ret = new PendingReviewDTO();
        ret.id = id;
        ret.status = 'Queued';
        ret.professor = request.professor;
        ret.courseType = request.courseType;
        ret.grade = request.grade;
        ret.gradeLevel = request.gradeLevel;
        ret.postDate = new Date();
        ret.overallRating = request.overallRating;
        ret.presentsMaterialClearly = request.presentsMaterialClearly;
        ret.recognizesStudentDifficulties = request.recognizesStudentDifficulties;
        ret.courseNum = request.courseNum;
        ret.department = request.department;
        ret.rating = request.rating;

        return ret;
    }
}
