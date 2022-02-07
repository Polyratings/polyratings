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
import { ExcludeFrontend, ExposeFrontend } from '../utils/decorators';
import { ReviewDTO } from './Reviews';
import { roundToPrecision } from '../utils/math';

class Review extends BaseDTO implements SharedReview {
    @IsUUID()
    @ExcludeFrontend()
    id: string;

    @IsUUID()
    @ExcludeFrontend()
    professor: string;

    @ExposeFrontend()
    gradeLevel: GradeLevel;

    @ExposeFrontend()
    grade: Grade;

    @ExposeFrontend()
    courseType: CourseType;

    @ExposeFrontend()
    postDate: Date;

    @ExposeFrontend()
    rating: string;
}

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
    @Transform(({ value, options }) => {
        Object.entries(value).forEach(([course, reviews]) => {
            value[course] = plainToInstance(Review, reviews, options);
        });
        return value;
    })
    @ExposeFrontend()
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
