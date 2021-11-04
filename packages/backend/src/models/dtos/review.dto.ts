import { IsNotEmpty } from "class-validator";
import { Review } from "../interfaces/Review";
import { ClassDto } from "./class.dto";

export class ReviewDto implements Review {
    id?:number
    createdAt?: Date

    class?:ClassDto

    @IsNotEmpty()
    year:string

    @IsNotEmpty()
    grade:string

    @IsNotEmpty()
    reasonForTaking:string

    @IsNotEmpty()
    text:string
}