import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, Max, Min, ValidateNested } from "class-validator";
import { Review } from "./review.dto";

export class AddReview {

    @IsNotEmpty()
    teacherId:string

    @IsNotEmpty()
    classIdOrName:string

    @ValidateNested()
    @Type(() => Review)
    review:Review

    @IsNumber()
    @Min(0)
    @Max(4)
    @Type(() => Number)
    overallRating:number

    @IsNumber()
    @Min(0)
    @Max(4)
    @Type(() => Number)
    recognizesStudentDifficulties:number

    @IsNumber()
    @Min(0)
    @Max(4)
    @Type(() => Number)
    presentsMaterialClearly:number
}