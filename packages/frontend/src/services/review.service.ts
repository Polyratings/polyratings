import { AddReviewRequest, Client, ReportReviewRequest, Teacher } from "@polyratings/client";
import { TeacherService } from ".";

export class ReviewService {
    constructor(private client: Client, private teacherService: TeacherService) {}

    async uploadReview(addReviewRequest: AddReviewRequest): Promise<Teacher> {
        const processingResponse = await this.client.ratings.add(addReviewRequest);

        if (!processingResponse.updatedProfessor) {
            throw new Error(processingResponse.message);
        }

        this.teacherService.overrideCacheEntry(processingResponse.updatedProfessor);
        return processingResponse.updatedProfessor;
    }

    async reportReview(report: ReportReviewRequest) {
        await this.client.ratings.report(report);
    }
}
