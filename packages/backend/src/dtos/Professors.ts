import { Allow, IsIn, IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import {
    BaseDTO,
    GradeLevel,
    Grade,
    CourseType,
    DEPARTMENT_LIST,
    Teacher,
    Review as SharedReview,
} from '@polyratings/shared';
import { ExcludeFrontend } from '../utils/decorators';
import { ReviewDTO } from './Reviews';
import { roundToPrecision } from '../utils/math';

class Review extends BaseDTO implements SharedReview {
    @IsUUID()
    @ExcludeFrontend()
    id: string;

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
    // TODO: Validate teachers reviews
    @Allow()
    @Transform(({ value, options }) => {
        Object.entries(value).forEach(([course, reviews]) => {
            value[course] = plainToInstance(Review, reviews, options);
        });
        return value;
    })
    reviews: Record<string, Review[]>;

    addReview(review: ReviewDTO, courseName: string) {
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

    toTruncatedProfessorDTO():TruncatedProfessorDTO {
        return plainToInstance(TruncatedProfessorDTO, this, {excludeExtraneousValues: true})
    }
}
