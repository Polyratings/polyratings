export interface Review extends ReviewCreation {
    id:number
    createdAt: Date
}

export interface ReviewCreation {
    year:string
    grade:string
    reasonForTaking:string
    text:string
}

export interface ReviewUpload {
    teacherId:number
    classIdOrName:string
    review:ReviewCreation
    overallRating:number
    recognizesStudentDifficulties:number
    presentsMaterialClearly:number
}