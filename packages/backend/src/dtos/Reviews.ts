import { GradeLevel, Grade, CourseType, Review, BaseDTO, AddReviewRequest } from '@polyratings/shared';
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

export type PendingReviewStatus = "Queued" | "Processing" | "Successful" | "Failed";

export class PendingReviewDTO extends ReviewDTO {
    @IsDefined()
    status: PendingReviewStatus;
    sentimentResponse?: object // TODO: Codify some data shape/structure for this

    constructor(id: string, request: AddReviewRequest) {
        super();

        this.id = id;
        this.status = 'Queued';
        this.professor = request.professor;
        this.courseType = request.courseType;
        this.grade = request.grade;
        this.gradeLevel = request.gradeLevel;
        this.postDate = new Date();
        this.overallRating = request.overallRating;
        this.presentsMaterialClearly = request.presentsMaterialClearly;
        this.recognizesStudentDifficulties = request.recognizesStudentDifficulties;
        this.rating = request.rating;
    }
}
