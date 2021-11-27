import { Review } from "./Review";
import { DatabaseEntry, InterfaceType } from "./DatabaseEntry";

export type TeacherEntry = DatabaseEntry<'db', _Teacher<'db'>>

export type Teacher = _Teacher<'plain'>

export interface _Teacher<T extends InterfaceType> {
    id?: string;
    createdAt?: Date;
    firstName:string;
    lastName:string
    department:string;
    overallRating:number; 
    studentDifficulties:number;
    materialClear:number;
    numEvals:number;
    courses:string[]
    reviews?: {[taughtClass:string] : DatabaseEntry<T, Review>[]}
}