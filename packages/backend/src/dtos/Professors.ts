import { Allow, IsIn, IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import {
    BaseDTO,
    DEPARTMENT_LIST,
    Teacher,
    ExposeFrontend,
    AddProfessorRequest,
} from '@polyratings/shared';
import { ReviewDTO } from './Reviews';
import { roundToPrecision } from '../utils/math';

export class TruncatedProfessorDTO extends BaseDTO implements Teacher {
    @IsUUID()
    @ExposeFrontend()
    id: string;

    @IsIn(DEPARTMENT_LIST)
    @ExposeFrontend()
    department: string;

    @IsNotEmpty()
    @ExposeFrontend()
    firstName: string;

    @IsNotEmpty()
    @ExposeFrontend()
    lastName: string;

    @IsInt()
    @Min(0)
    @ExposeFrontend()
    numEvals: number;

    @Min(0)
    @Max(4)
    @ExposeFrontend()
    overallRating: number;

    @Min(0)
    @Max(4)
    @ExposeFrontend()
    materialClear: number;

    @Min(0)
    @Max(4)
    @ExposeFrontend()
    studentDifficulties: number;

    // @IsValidCourse({ each: true })
    @Allow()
    @ExposeFrontend()
    courses: string[];
}

export class ProfessorDTO extends TruncatedProfessorDTO {
    // TODO: Validate teachers reviews
    @Allow()
    @Transform(
        ({ value, options }) => {
            Object.entries(value).forEach(([course, reviews]) => {
                value[course] = plainToInstance(ReviewDTO, reviews, options);
            });
            return value;
        },
        { toClassOnly: true },
    )
    @ExposeFrontend()
    reviews: Record<string, ReviewDTO[]>;

    addReview(review: ReviewDTO, courseName: string) {
        // Ensure that the review has the correct professor id
        // TODO: Investigate the necessity of having this field
        review.professor = this.id;

        if (!this.courses.includes(courseName)) {
            this.courses.push(courseName);
        }

        const reviews = this.reviews[courseName];
        if (!reviews) {
            this.reviews[courseName] = [review];
        } else {
            reviews.push(review);
        }

        const newMaterial =
            (this.materialClear * this.numEvals + review.presentsMaterialClearly) /
            (this.numEvals + 1);
        const newStudentDiff =
            (this.studentDifficulties * this.numEvals + review.recognizesStudentDifficulties) /
            (this.numEvals + 1);
        const newOverall =
            (this.overallRating * this.numEvals + review.overallRating) / (this.numEvals + 1);

        this.numEvals = this.numEvals + 1;

        // this properly rounds all of our statistics to the nearest hundredth
        this.materialClear = roundToPrecision(newMaterial, 2);
        this.studentDifficulties = roundToPrecision(newStudentDiff, 2);
        this.overallRating = roundToPrecision(newOverall, 2);
    }

    toTruncatedProfessorDTO(): TruncatedProfessorDTO {
        return plainToInstance(TruncatedProfessorDTO, this, { excludeExtraneousValues: true });
    }

    static fromAddProfessorRequest(addProfessorRequest: AddProfessorRequest): ProfessorDTO {
        const plainReview: PlainNewProfessorReviewDTO = {
            professor: addProfessorRequest.id,
            ...addProfessorRequest.review,
        };
        // Not put in a function since any other time we should be going to a pending
        const review = plainToInstance(ReviewDTO, plainReview, {
            excludeExtraneousValues: true,
        });

        const courseName = `${addProfessorRequest.review.department} ${addProfessorRequest.review.courseNum}`;
        const plain: PlainProfessorDTO = {
            overallRating: review.overallRating,
            studentDifficulties: review.recognizesStudentDifficulties,
            materialClear: review.presentsMaterialClearly,
            courses: [courseName],
            reviews: {
                [courseName]: [review],
            },
            ...addProfessorRequest,
        };

        return plainToInstance(ProfessorDTO, plain, {
            excludeExtraneousValues: true,
        });
    }
}

// Not Pretty but will at least cause compile time errors
type PlainProfessorDTO = Omit<ProfessorDTO, 'addReview' | 'toTruncatedProfessorDTO'>;
type PlainNewProfessorReviewDTO = Omit<ReviewDTO, 'postDate' | 'id'>;
