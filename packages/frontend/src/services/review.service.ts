import {
    AddReviewRequest,
    AddReviewResponse,
    ProcessingReviewResponse,
    ReportReviewRequest,
    Teacher,
} from "@polyratings/client";
import { config } from "@/App.config";
import { HttpService } from "./http.service";
import { TeacherService } from ".";

export class ReviewService {
    constructor(private httpService: HttpService, private teacherService: TeacherService) {}

    async uploadReview(addReviewRequest: AddReviewRequest): Promise<Teacher> {
        const addReviewRes = await this.httpService.fetch(
            `${config.remoteUrl}/professors/${addReviewRequest.professor}/ratings`,
            {
                method: "POST",
                body: JSON.stringify(addReviewRequest),
            },
        );

        const addReviewResponse = (await addReviewRes.json()) as AddReviewResponse;

        if (!addReviewResponse.newReviewId) {
            throw new Error(addReviewResponse.statusMessage);
        }
        const processingReviewRes = await this.httpService.fetch(
            `${config.remoteUrl}/ratings/${addReviewResponse.newReviewId}`,
        );
        const processingResponse = (await processingReviewRes.json()) as ProcessingReviewResponse;

        if (!processingResponse.updatedProfessor) {
            throw new Error(processingResponse.message);
        }

        this.teacherService.overrideCacheEntry(processingResponse.updatedProfessor);
        return processingResponse.updatedProfessor;
    }

    async reportReview(report: ReportReviewRequest) {
        await this.httpService.fetch(`${config.remoteUrl}/rating/report`, {
            method: "POST",
            body: JSON.stringify(report),
        });
    }
}
