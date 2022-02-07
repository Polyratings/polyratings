import { BaseDTO } from './BaseDTO';

export class ProcessingReviewResponse extends BaseDTO {
    constructor(
        public readonly success: boolean,
        public readonly message?: string,
    ) {
        super()
    }
}