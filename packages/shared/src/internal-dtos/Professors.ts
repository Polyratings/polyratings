import { Allow, IsIn, IsInt, IsNotEmpty, IsUUID, Max, Min } from "class-validator";
import { plainToInstance, Transform } from "class-transformer";
import { roundToPrecision } from "../utils";
import { AddProfessorRequest, BaseDTO } from "../public-dtos";
import { Teacher } from "../interfaces";
import { ExposeFrontend } from "../decorators";
import { ReviewDTO } from "./Reviews";
import { DEPARTMENT_LIST } from "../constants";

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

        this.numEvals += 1;

        // this properly rounds all of our statistics to the nearest hundredth
        this.materialClear = roundToPrecision(newMaterial, 2);
        this.studentDifficulties = roundToPrecision(newStudentDiff, 2);
        this.overallRating = roundToPrecision(newOverall, 2);
    }

    removeReview(reviewId: string) {
        const targetCourse = Object.entries(this.reviews).find(([, courseReviews]) =>
            courseReviews.find((review) => review.id === reviewId),
        );

        if (!targetCourse) {
            throw new Error("Review Does not exist");
        }

        const [courseName, reviews] = targetCourse;

        let removedReview: ReviewDTO;
        if (reviews.length === 1) {
            [removedReview] = this.reviews[courseName];
            delete this.reviews[courseName];
            const coursesIndex = this.courses.indexOf(courseName);
            if (coursesIndex === -1) {
                throw new Error("Course to be removed is missing from professorDTO courses");
            }
            // Modifies in place
            this.courses.splice(coursesIndex, 1);
        } else {
            // We know this index is good since we found it previously
            const reviewIndex = reviews.findIndex((review) => review.id === reviewId);
            removedReview = this.reviews[courseName][reviewIndex];
            // Modifies in place
            this.reviews[courseName].splice(reviewIndex, 1);
        }

        if (this.numEvals === 1) {
            this.materialClear = 0;
            this.studentDifficulties = 0;
            this.overallRating = 0;
            this.numEvals = 0;
        } else {
            // Adjust stats
            const newMaterial =
                (this.materialClear * this.numEvals - removedReview.presentsMaterialClearly) /
                (this.numEvals - 1);
            const newStudentDiff =
                (this.studentDifficulties * this.numEvals -
                    removedReview.recognizesStudentDifficulties) /
                (this.numEvals - 1);
            const newOverall =
                (this.overallRating * this.numEvals - removedReview.overallRating) /
                (this.numEvals - 1);

            this.numEvals -= 1;

            // this properly rounds all of our statistics to the nearest hundredth
            this.materialClear = roundToPrecision(newMaterial, 2);
            this.studentDifficulties = roundToPrecision(newStudentDiff, 2);
            this.overallRating = roundToPrecision(newOverall, 2);
        }
    }

    toTruncatedProfessorDTO(): TruncatedProfessorDTO {
        return plainToInstance(TruncatedProfessorDTO, this, { excludeExtraneousValues: true });
    }

    static fromAddProfessorRequest(addProfessorRequest: AddProfessorRequest): ProfessorDTO {
        // @ts-expect-error cloudflare runtime function
        const newProfessorId = crypto.randomUUID();

        const plainReview: PlainNewProfessorReviewDTO = {
            professor: newProfessorId,
            ...addProfessorRequest.review,
        };
        // Not put in a function since any other time we should be going to a pending
        const review = plainToInstance(ReviewDTO, plainReview, {
            excludeExtraneousValues: true,
        });

        const courseName = `${addProfessorRequest.review.department} ${addProfessorRequest.review.courseNum}`;
        const plain: PlainProfessorDTO = {
            id: newProfessorId,
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
export type PlainProfessorDTO = Omit<
    ProfessorDTO,
    "addReview" | "removeReview" | "toTruncatedProfessorDTO"
>;
export type PlainNewProfessorReviewDTO = Omit<ReviewDTO, "postDate" | "id">;
