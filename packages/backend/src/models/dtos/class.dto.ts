import { Type } from "class-transformer";
import { IsNotEmpty, MaxLength, ValidateNested } from "class-validator";
import { Review } from "./review.dto";
import { Teacher } from "./teacher.dto";

export class Class {
    id?:number
    createdAt?: Date

    teacher?:Teacher

    @IsNotEmpty()
    @MaxLength(255)
    name:string

    @ValidateNested({ each: true })
    @Type(() => Review)
    reviews?:Review[]
}