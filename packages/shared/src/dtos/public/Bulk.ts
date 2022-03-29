import { IsArray } from "class-validator";
import { Default } from "../../decorators";
import { BaseDTO } from "./BaseDTO";

export const bulkKeys = [
    "professors",
    "rating-queue",
    "professor-queue",
    "reports",
    "users",
] as const;
export type BulkKey = typeof bulkKeys[number];

export class BulkValueRequest extends BaseDTO {
    @Default(() => [])
    @IsArray()
    keys: string[];
}
