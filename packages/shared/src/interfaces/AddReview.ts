import { Review } from "./Reviews";

export interface AddReview {
    teacherId:number
    classIdOrName:string
    review:Review
    overallRating:number
    recognizesStudentDifficulties:number
    presentsMaterialClearly:number
}