import { Review } from "./Review";
import { Teacher } from "./Teacher";

export interface Class {
    id?:number
    createdAt?: Date
    teacher?:Teacher
    name:string
    reviews:Review[]
}