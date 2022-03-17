import { IsUUID } from "class-validator";
import { BaseDTO } from "./BaseDTO";

export class MergeProfessorRequest extends BaseDTO {
    @IsUUID()
    sourceId: string;

    @IsUUID()
    destId: string;
}
