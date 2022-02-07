import { Env } from '@polyratings/backend/bindings';
import { Context } from 'sunder';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { PendingReviewDTO } from '@polyratings/backend/dtos/Reviews';

const ANALYZE_COMMENT_URL = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";

export class PerspectiveDAO {

    private readonly apiKey: string;

    constructor(ctx: Context<Env>) {
        this.apiKey = ctx.env.PERSPECTIVE_API_KEY;
    }

    async analyzeReview(review: PendingReviewDTO): Promise<AnalyzeCommentResponse> {
        let httpResponse: Response;
        // TODO: Perhaps we should define a default request?
        const request: AnalyzeCommentRequest = {
            comment: {
                text: review.rating,
                type: 'PLAIN_TEXT'
            },
            requestedAttributes: {
                SEVERE_TOXICITY: {},
                IDENTITY_ATTACK: {},
                THREAT: {},
                SEXUALLY_EXPLICIT: {}
            },
            languages: ['en'],
            clientToken: 'Polyratings'
        }

        try {
            httpResponse = await fetch(
                `${ANALYZE_COMMENT_URL}?key=${this.apiKey}`,
                {body: JSON.stringify(request), method: 'POST'}
            );
        } catch (e) {
            console.error()
            throw new PolyratingsError(500, JSON.stringify(e));
        }

        if (httpResponse.status !== 200) {
            console.error(httpResponse);
            throw new PolyratingsError(500, "Request to analyze comment failed!");
        }

        return await httpResponse.json() as AnalyzeCommentResponse;
    }

}

/*
 * Below are a series of types used to enable the proper operation of this DAO
 * It is likely that we don't actually need to expose all of these to the rest of the package
 * so as such TODO: Determine what types here actually need to be exported and which do not
 *
 * All of these types and interfaces are derived from the descriptions at:
 * https://developers.perspectiveapi.com/s/about-the-api-methods
 */

export type PerspectiveAttributeNames = PerspectiveProductionAttributeNames |
    PerspectiveExperimentalAttributeNames;

export type PerspectiveProductionAttributeNames = "TOXICITY" | "SEVERE_TOXICITY" | "IDENTITY_ATTACK" | "INSULT" |
    "PROFANITY" | "THREAT";

export type PerspectiveExperimentalAttributeNames = "TOXICITY_EXPERIMENTAL" |
    "SEVERE_TOXICITY_EXPERIMENTAL" | "IDENTITY_ATTACK_EXPERIMENTAL" |
    "INSULT_EXPERIMENTAL" | "PROFANITY_EXPERIMENTAL" | "THREAT_EXPERIMENTAL" |
    "SEXUALLY_EXPLICIT" | "FLIRTATION";

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
        }
    }[]
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
