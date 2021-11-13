import { Review } from "./Review";
import { DatabaseEntry, InterfaceType } from "./DatabaseEntry";
export declare type TeacherEntry = DatabaseEntry<'db', _Teacher<'db'>>;
export declare type Teacher = _Teacher<'plain'>;
export interface _Teacher<T extends InterfaceType> {
    id?: string;
    createdAt?: Date;
    firstName: string;
    lastName: string;
    department: string;
    avgRating: string;
    numEvals: number;
    reviews?: DatabaseEntry<T, Review>[];
}
