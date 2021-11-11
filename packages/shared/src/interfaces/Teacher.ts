import { _Class } from "./Class";
import { DatabaseEntry, InterfaceType } from "./DatabaseEntry";
  
export type TeacherEntry = DatabaseEntry<'db', _Teacher<'db'>>

export type Teacher = _Teacher<'plain'>

const test:TeacherEntry = {
    id:1,
    createdAt:new Date(),
    name:'',
    department:'',
    overallRating:4,
    recognizesStudentDifficulties:4,
    presentsMaterialClearly:4,
    numberOfEvaluations:4,
    classes:[{
        name:'',
        id:1,
        createdAt:new Date(),
        reviews:[{
            id:1,
            createdAt:new Date(),
            year:'',
            grade:'',
            reasonForTaking:'',
            text:''
        }]
    }]
}

export interface _Teacher<T extends InterfaceType> {
    id?: number;
    createdAt?: Date;
    name:string;
    department:string;
    overallRating:number; 
    recognizesStudentDifficulties:number;
    presentsMaterialClearly:number;
    numberOfEvaluations:number;
    classes?:DatabaseEntry<T, _Class<T>>[];
}