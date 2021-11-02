import { Review, ReviewCreation } from "./Review";

export interface Class {
    id:number
    createdAt: Date
    name:string
    reviews:Review[]
}

export interface ClassCreation {
    name:string
    reviews:ReviewCreation[]
}