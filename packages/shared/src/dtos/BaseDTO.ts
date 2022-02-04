import { Allow } from "class-validator";

export abstract class BaseDTO {
    @Allow()
    static __base_dto_marker__ = true
}