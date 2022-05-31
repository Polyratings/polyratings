import { IsIn, IsString, IsUUID } from "class-validator";
import { DEPARTMENT_LIST } from "../../constants";
import { BaseDTO } from "./BaseDTO";

export class ChangeDepartmentRequest extends BaseDTO {
    @IsUUID()
    professorId: string;

    @IsIn(DEPARTMENT_LIST)
    department: string;
}

export class ChangeNameRequest extends BaseDTO {
    @IsUUID()
    professorId: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;
}
