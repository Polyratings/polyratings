import { IsEmail, IsString, IsUUID, ValidateIf } from "class-validator";
import { BaseDTO } from "./BaseDTO";

export class ReportReviewRequest extends BaseDTO {
    @IsUUID()
    ratingId: string;

    @IsUUID()
    professorId: string;

    @ValidateIf((r: ReportReviewRequest) => r.email !== "") // check only when blank string not found
    @IsEmail()
    email: string;

    @IsString()
    reason: string;
}
