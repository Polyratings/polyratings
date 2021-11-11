import { _Class } from "./Class";
import { DatabaseEntry, InterfaceType } from "./DatabaseEntry";
export declare type TeacherEntry = DatabaseEntry<'db', _Teacher<'db'>>;
export declare type Teacher = _Teacher<'plain'>;
export interface _Teacher<T extends InterfaceType> {
    id?: number;
    createdAt?: Date;
    name: string;
    department: string;
    overallRating: number;
    recognizesStudentDifficulties: number;
    presentsMaterialClearly: number;
    numberOfEvaluations: number;
    classes?: DatabaseEntry<T, _Class<T>>[];
}
