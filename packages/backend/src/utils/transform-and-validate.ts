import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { DEFAULT_VALIDATOR_OPTIONS } from "./const";

export type Constructs<T> = new (...args: any[]) => T;

export async function transformAndValidate<T extends object>(target:Constructs<T>, plain:unknown): Promise<T> {
    const transformedValue = plainToInstance(target, plain)
    await validateOrReject(transformedValue, DEFAULT_VALIDATOR_OPTIONS)
    return transformedValue
}