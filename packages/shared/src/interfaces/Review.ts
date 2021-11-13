import { Class } from "./Class";
import { DatabaseEntry, InterfaceType } from "./DatabaseEntry";

export type ReviewEntry = DatabaseEntry<'db', Review>

export interface Review {
    id?: string;
    createdAt?: Date;
    class?:Class
    gradeLevel:string
    grade:string
    courseType:string
    rating:string
    department:string
    courseNum:string
    postDate:string
}