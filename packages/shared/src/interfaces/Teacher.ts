import { Review } from "./Review";
import { _Class } from "./Class";
import { DatabaseEntry, InterfaceType } from "./DatabaseEntry";
  
export type TeacherEntry = DatabaseEntry<'db', _Teacher<'db'>>

export type Teacher = _Teacher<'plain'>

export interface _Teacher<T extends InterfaceType> {
    id?: string;
    createdAt?: Date;
    firstName:string;
    lastName:string
    department:string;
    avgRating:string; 
    // recognizesStudentDifficulties:number;
    // presentsMaterialClearly:number;
    numEvals:number;
    // classes?:DatabaseEntry<T, _Class<T>>[];
    reviews?: DatabaseEntry<T, Review>[]
}