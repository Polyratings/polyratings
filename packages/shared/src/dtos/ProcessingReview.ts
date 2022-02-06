import { BaseDTO } from './BaseDTO';

export class ProcessingReviewResponse extends BaseDTO {
    success: boolean;
    message?: string;
}