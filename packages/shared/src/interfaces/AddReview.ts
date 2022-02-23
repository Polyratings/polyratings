import { Review } from "./Review";

export interface AddReview {
    teacherId: number;
    classIdOrName: string;
    review: Review;
    overallRating: number;
    recognizesStudentDifficulties: number;
    presentsMaterialClearly: number;
}
