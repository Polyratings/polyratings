import { Expose, Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator";
import { Class } from "./class.dto";

export class Teacher {
    id?:number;
    createdAt?: Date;
    
    @IsNotEmpty()
    name:string;

    @IsString()
    department:string;

    @IsNumber()
    @Type(() => Number) 
    overallRating:number;

    @IsNumber()
    @Type(() => Number) 
    recognizesStudentDifficulties:number;

    @IsNumber()
    @Type(() => Number) 
    presentsMaterialClearly:number;

    @IsNumber()
    @Type(() => Number) 
    numberOfEvaluations:number;
    
    @ValidateNested({ each: true })
    @Type(() => Class)
    classes?:Class[];
}