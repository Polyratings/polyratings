import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, Max, Min, ValidateNested } from "class-validator";
import { ReviewDto } from "./review.dto";

export class AddReviewDto {

    @IsNotEmpty()
    teacherId:string

    @IsNotEmpty()
    classIdOrName:string

    @ValidateNested()
    @Type(() => ReviewDto)
    review:ReviewDto

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