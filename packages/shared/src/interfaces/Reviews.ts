export type GradeLevel = "Freshman" | "Sophomore" | "Junior" | "Senior" | "5th/6th Year" | "Grad Student";
export type CourseType = "Elective" | "General Ed" | "Required (Major)" | "Required (Support)";
export type CourseGrade = "N/A" | "A" | "B" | "C" | "D" | "F" | "W" | "CR" | "NC";

/**
 * Representation of a review on the Polyratings site
 * (can be either an already-created review, or one in the process of being created)
 */
export interface Review {
    id?: string,
    professor: string,
    gradeLevel: GradeLevel,
    grade: CourseGrade,
    courseType: CourseType,
    rating: string,
    department?: string,
    courseNum?: number,
    postDate: Date,
}

/**
 * Body of a request to POST /professors/:id/ratings
 */
export interface AddReviewRequest {
    professor: string,
    department: string,
    courseNum: number,
    overallRating: number,
    recognizesStudentDifficulty: number,
    presentsMaterialClearly: number,
    review: Review,
}