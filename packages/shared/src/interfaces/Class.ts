import { DatabaseEntry, InterfaceType } from "./DatabaseEntry";
import { Review } from "./Review";
import { _Teacher } from "./Teacher";

export type ClassEntry = _Class<'db'>
export type Class = _Class<'plain'>

export interface _Class<T extends InterfaceType> {
    id?: number;
    createdAt?: Date;
    teacher?:_Teacher<T>
    name:string
    reviews?: DatabaseEntry<T, Review>[]
}