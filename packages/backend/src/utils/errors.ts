import { HttpStatus } from "sunder";

export class PolyratingsError extends Error {
    constructor(public readonly status: HttpStatus, public readonly body: unknown) {
        super();
    }
}
