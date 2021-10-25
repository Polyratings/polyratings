import { Review } from "./Review";

export interface Class {
    id:number
    createdAt: Date
    name:string
    reviews:Review[]
}