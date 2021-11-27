import { DatabaseEntry, InterfaceType } from "./DatabaseEntry";

export type ReviewEntry = DatabaseEntry<'db', Review>

export interface Review {
    id?: string;
    profferer:string
    gradeLevel:string
    grade:string
    courseType:string
    rating:string
    department:string
    courseNum:string
    postDate:Date
}