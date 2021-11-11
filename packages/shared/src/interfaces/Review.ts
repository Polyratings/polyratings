import { Class } from "./Class";
import { DatabaseEntry, InterfaceType } from "./DatabaseEntry";

export type ReviewEntry = DatabaseEntry<'db', Review>

export interface Review {
    id?: number;
    createdAt?: Date;
    class?:Class
    year:string
    grade:string
    reasonForTaking:string
    text:string
}