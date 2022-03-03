import {
    BaseDTO,
    ExposeFrontend,
    ReportReviewRequest,
    RatingReport as RatingReportInterface,
} from "@polyratings/shared";
import { plainToInstance, Type } from "class-transformer";
import { IsEmail, IsString, IsUUID, ValidateIf, ValidateNested } from "class-validator";

export class RatingReport extends BaseDTO implements RatingReportInterface {
    @IsUUID()
    @ExposeFrontend()
    ratingId: string;

    @Type(() => Report)
    @ValidateNested()
    @ExposeFrontend()
    reports: Report[];

    @IsUUID()
    @ExposeFrontend()
    professorId: string;

    static fromReportReviewRequest(reportReviewRequest: ReportReviewRequest): RatingReport {
        const plain: RatingReportPlain = {
            reports: [{ reason: reportReviewRequest.reason, email: reportReviewRequest.email }],
            ...reportReviewRequest,
        };

        return plainToInstance(RatingReport, plain, { excludeExtraneousValues: true });
    }
}

type RatingReportPlain = Omit<RatingReport, "fromReportReviewRequest">;

export class Report {
    @ValidateIf((r: Report) => r.email !== "") // check only when blank string not found
    @IsEmail()
    @ExposeFrontend()
    email: string;

    @IsString()
    @ExposeFrontend()
    reason: string;
}
