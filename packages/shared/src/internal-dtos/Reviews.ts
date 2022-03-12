import {
    Allow,
    IsDate,
    IsDefined,
    IsIn,
    IsInt,
    IsUUID,
    Max,
    Min,
    MinLength,
} from "class-validator";
import { plainToInstance, Type } from "class-transformer";
import { Default, ExcludeFrontend, ExposeFrontend } from "../decorators";
import { CourseType, Grade, GradeLevel, Review } from "../interfaces";
import { DEPARTMENT_LIST } from "../constants";
import { AddReviewRequest, BaseDTO } from "../public-dtos";

export class ReviewDTO extends BaseDTO implements Review {
    @IsUUID()
    @ExposeFrontend()
    // @ts-expect-error cloudflare runtime function
    @Default(() => crypto.randomUUID())
    id: string;

    @IsUUID()
    @ExcludeFrontend()
    professor: string;

    @IsDefined()
    @ExposeFrontend()
    grade: Grade;

    @IsDefined()
    @ExposeFrontend()
    gradeLevel: GradeLevel;

    @IsDefined()
    @ExposeFrontend()
    courseType: CourseType;

    @IsDate()
    @Type(() => Date)
    @Default(() => new Date())
    @ExposeFrontend()
    postDate: Date = new Date();

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    overallRating: number;

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    presentsMaterialClearly: number;

    @IsInt()
    @Min(0)
    @Max(4)
    @ExcludeFrontend()
    recognizesStudentDifficulties: number;

    @MinLength(20)
    @ExposeFrontend()
    rating: string;
}

export type PendingReviewStatus = "Queued" | "Processing" | "Successful" | "Failed";

// TODO: Determine why class-transformer/validator is unable to validate/transform this object
// likely because of inheritance, so we may just have to explicitly enumerate all of the fields present
export class PendingReviewDTO extends ReviewDTO {
    // Default state on creation is Queued
    @Allow()
    @ExcludeFrontend()
    @Default(() => "Queued")
    status: PendingReviewStatus;

    @Allow()
    @ExposeFrontend()
    error?: string;

    @Allow()
    @ExposeFrontend()
    sentimentResponse?: Partial<Record<PerspectiveAttributeNames, PerspectiveAttributeScore>>;

    @IsInt()
    @Min(100)
    @Max(599)
    @ExposeFrontend()
    courseNum: number;

    @IsIn(DEPARTMENT_LIST)
    @ExposeFrontend()
    department: string;

    static fromAddReviewRequest(request: AddReviewRequest): PendingReviewDTO {
        return plainToInstance(PendingReviewDTO, request);
    }

    toReviewDTO(): ReviewDTO {
        return plainToInstance(ReviewDTO, this, {
            excludeExtraneousValues: true,
        });
    }
}

export type PendingReviewDTOPlain = Omit<PendingReviewDTO, "fromAddReviewRequest" | "toReviewDTO">;

/*
 * Below are a series of types used to enable the proper operation of this DAO
 * It is likely that we don't actually need to expose all of these to the rest of the package
 * so as such TODO: Determine what types here actually need to be exported and which do not
 *
 * All of these types and interfaces are derived from the descriptions at:
 * https://developers.perspectiveapi.com/s/about-the-api-methods
 */

export type PerspectiveAttributeNames =
    | PerspectiveProductionAttributeNames
    | PerspectiveExperimentalAttributeNames;

export type PerspectiveProductionAttributeNames =
    | "TOXICITY"
    | "SEVERE_TOXICITY"
    | "IDENTITY_ATTACK"
    | "INSULT"
    | "PROFANITY"
    | "THREAT";

export type PerspectiveExperimentalAttributeNames =
    | "TOXICITY_EXPERIMENTAL"
    | "SEVERE_TOXICITY_EXPERIMENTAL"
    | "IDENTITY_ATTACK_EXPERIMENTAL"
    | "INSULT_EXPERIMENTAL"
    | "PROFANITY_EXPERIMENTAL"
    | "THREAT_EXPERIMENTAL"
    | "SEXUALLY_EXPLICIT"
    | "FLIRTATION";

export interface PerspectiveRequestedAttribute {
    scoreType?: "PROBABILITY";
    scoreThreshold?: number; // needs to be between 0 and 1
}

export interface PerspectiveAttributeScore {
    summaryScore: {
        value: number;
        type: string;
    };
    spanScores?: {
        begin: number;
        end: number;
        score: {
            value: number;
            type: string;
        };
    }[];
}

export interface AnalyzeCommentRequest {
    comment: {
        text: string;
        type: "PLAIN_TEXT";
    };
    requestedAttributes: Partial<Record<PerspectiveAttributeNames, PerspectiveRequestedAttribute>>;
    languages?: string[];
    doNotStore?: boolean;
    clientToken?: string;
    sessionId?: string;
    communityId?: string;
}

export interface AnalyzeCommentResponse {
    attributeScores: Partial<Record<PerspectiveAttributeNames, PerspectiveAttributeScore>>;
    languages: string[];
    clientToken: string;
}
