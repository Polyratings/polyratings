export type GradeLevel = "Freshman" | "Sophomore" | "Junior" | "Senior" | "5th/6th Year" | "Grad Student";
export type Grade = "N/A" | "A" | "B" | "C" | "D" | "F" | "CR" | "NC" | "W";
export type CourseType = "Elective" | "General Ed" | "Major (Support)" | "Major (Required)";

/**
 * There may potentially be significant overlap between a Review and ReviewEntry
 * this is done as a design practice to sanitize data between the backend data
 * stores and the frontend.
 */
export interface Review {
    gradeLevel: GradeLevel;
    grade: Grade;
    courseType: CourseType;
    postDate: Date;
    rating: string;
}


