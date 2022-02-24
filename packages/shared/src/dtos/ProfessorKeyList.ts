import { IsArray } from "class-validator";
import { Default } from "../decorators";
import { BaseDTO } from "./BaseDTO";

export class ProfessorKeyList extends BaseDTO {
    @Default(() => [])
    @IsArray()
    professorKeys: string[];
}
