import { Class } from "./Class";

export interface Teacher {
    id?:number;
    createdAt?: Date;
    name:string;
    department:string;
    overallRating:number; 
    recognizesStudentDifficulties:number;
    presentsMaterialClearly:number;
    numberOfEvaluations:number;
    classes?:Class[];
}