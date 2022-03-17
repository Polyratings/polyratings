import { Allow } from "class-validator";

export abstract class BaseDTO {
    @Allow()
    // eslint-disable-next-line camelcase
    static __base_dto_marker__ = true;
}
