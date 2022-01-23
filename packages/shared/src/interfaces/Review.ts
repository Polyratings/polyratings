import { Type } from 'class-transformer';
import { Allow, IsDefined, IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export type GradeLevel = "Freshman" | "Sophomore" | "Junior" | "Senior" | "5th/6th Year" | "Grad Student";
export type Grade = "A" | "B" | "C" | "D" | "F" | "CR" | "NC" | "W";
export type CourseType = "Elective" | "General Ed" | "Major (Support)" | "Major (Required)"

/**
 * There may potentially be significant overlap between a Review and ReviewEntry
 * this is done as a design practice to sanitize data between the backend data
 * stores and the frontend.
 */
export class Review {
    professorId: string;
    gradeLevel: GradeLevel;
    grade: Grade;
    courseType: CourseType;
    courseNum: number;
    postDate: Date;
    department: string; // TODO: add some actual validation from a master-list or something
    rating: string;
}

export class ReviewEntry {
    id: string;
    professorId: string;
    gradeLevel: GradeLevel;
    grade: Grade;
    courseType: CourseType;
    courseNum: number;
    postDate: Date;
    department: string;
    rating: string;
}

/**
 * The expected content of a POST request to `POST /professors/:id/ratings`
 */
export class AddReviewRequest {
    @IsUUID()
    @IsDefined()
    @Allow()
    professorId: string;
    @IsDefined()
    gradeLevel: GradeLevel;
    @IsDefined()
    grade: Grade;
    @IsDefined()
    courseType: CourseType;
    @IsInt()
    @Min(100)
    @Max(599)
    courseNum: number;
    @Type(() => Date)
    postDate: Date;
    @IsNotEmpty()
    department: string;
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
    @IsNotEmpty()
    rating: string;
}
