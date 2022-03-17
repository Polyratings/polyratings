import {
    AddReviewRequest,
    AddReviewResponse,
    ProcessingReviewResponse,
    ReportReviewRequest,
} from "@polyratings/shared";
import { HttpModule } from ".";

export class RatingModule {
    constructor(private httpModule: HttpModule) {}

    /**
     * initiates the process of adding a rating. If the rating passes validation you will receive a token to use in the next step
     */
    async initiateAdd(rating: AddReviewRequest): Promise<AddReviewResponse> {
        const addReviewRes = await this.httpModule.fetch(
            `/professors/${rating.professor}/ratings`,
            {
                method: "POST",
                body: JSON.stringify(rating),
            },
        );

        return addReviewRes.json();
    }

    /**
     * Consumes the rating token received from the first step
     */
    async finishAdd(newReviewId: string): Promise<ProcessingReviewResponse> {
        const processingReviewRes = await this.httpModule.fetch(`/ratings/${newReviewId}`);
        return processingReviewRes.json();
    }

    /**
     * Adds a rating to polyratings, Errors if first step of validation process fails
     */
    async add(rating: AddReviewRequest): Promise<ProcessingReviewResponse> {
        const initialResponse = await this.initiateAdd(rating);
        if (!initialResponse.newReviewId) {
            throw new Error(initialResponse.statusMessage);
        }
        return this.finishAdd(initialResponse.newReviewId);
    }

    /**
     * Reports a desired rating. Reports will be manually reviewed.
     */
    async report(report: ReportReviewRequest) {
        await this.httpModule.fetch("rating/report", {
            method: "POST",
            body: JSON.stringify(report),
        });
    }
}
