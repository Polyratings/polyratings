import { Type } from "class-transformer";
import { IsNotEmpty, MaxLength, ValidateNested } from "class-validator";
import { Class } from "@polyratings-revamp/shared";
import { ReviewDto } from "./review.dto";
import { TeacherDto } from "./teacher.dto";

export class ClassDto implements Class {
    id?:number
    createdAt?: Date

    teacher?:TeacherDto

    @IsNotEmpty()
    @MaxLength(255)
    name:string

    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ReviewDto)
    reviews:ReviewDto[]
}