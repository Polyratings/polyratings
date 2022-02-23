import { Type } from "class-transformer";
import { Equals, IsIn, IsNotEmpty, ValidateNested } from "class-validator";
import { DEPARTMENT_LIST, NewReviewBase } from "../index";

export class AddProfessorRequest {
    @IsIn(DEPARTMENT_LIST)
    department: string;

    @IsNotEmpty()
    firstName: string;

    @IsNotEmpty()
    lastName: string;

    @Equals(1)
    numEvals: number;

    @ValidateNested()
    @Type(() => NewReviewBase)
    review: NewReviewBase;
}
