import { IsIn, IsUUID } from "class-validator";
import { DEPARTMENT_LIST } from "../constants";
import { BaseDTO } from "./BaseDTO";

export class ChangeDepartmentRequest extends BaseDTO {
    @IsUUID()
    professorId: string;

    @IsIn(DEPARTMENT_LIST)
    department: string;
}
