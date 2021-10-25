import { IsNotEmpty } from "class-validator";
import { Class } from "./class.dto";

export class Review {
    id?:number
    createdAt?: Date

    class?:Class

    @IsNotEmpty()
    year:string

    @IsNotEmpty()
    grade:string

    @IsNotEmpty()
    reasonForTaking:string

    timeStamp:string

    @IsNotEmpty()
    text:string
}