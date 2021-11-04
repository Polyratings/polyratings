import { Expose, Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator";
import { Teacher } from "../interfaces/Teacher";
import { ClassDto } from "./class.dto";

export class TeacherDto implements Teacher {
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
    @Type(() => ClassDto)
    classes?:ClassDto[];
}