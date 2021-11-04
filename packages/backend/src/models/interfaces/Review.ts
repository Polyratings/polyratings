import { Class } from "./Class";

export interface Review {
    id?:number
    createdAt?: Date
    class?:Class
    year:string
    grade:string
    reasonForTaking:string
    text:string
}