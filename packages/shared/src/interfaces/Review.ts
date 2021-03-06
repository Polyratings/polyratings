export const GradeLevelOptions = [
    "Freshman",
    "Sophomore",
    "Junior",
    "Senior",
    "5th/6th Year",
    "Grad Student",
] as const;
export type GradeLevel = typeof GradeLevelOptions[number];
export const GradeOptions = ["N/A", "A", "B", "C", "D", "F", "CR", "NC", "W"] as const;
export type Grade = typeof GradeOptions[number];
export const CourseTypeOptions = [
    "Elective",
    "General Ed",
    "Major (Support)",
    "Major (Required)",
] as const;
export type CourseType = typeof CourseTypeOptions[number];

export interface Review {
    id: string;
    gradeLevel: GradeLevel;
    grade: Grade;
    courseType: CourseType;
    postDate: Date;
    rating: string;
}
