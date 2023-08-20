import type { PendingRating, PerspectiveAttributeScore } from "@backend/types/schema";

const ANALYZE_COMMENT_URL = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";

export type AnalyzedRating = Record<string, number>;
export type RatingAnalyzer = {
    analyzeRaring(rating: PendingRating): Promise<AnalyzedRating>;
};

export class PerspectiveDAO implements RatingAnalyzer {
    constructor(private readonly apiKey: string) {}

    async analyzeRaring(rating: PendingRating): Promise<AnalyzedRating> {
        // TODO: Perhaps we should define a default request?
        const requestBody: AnalyzeCommentRequest = {
            comment: {
                text: rating.rating,
                type: "PLAIN_TEXT",
            },
            requestedAttributes: {
                SEVERE_TOXICITY: {},
                IDENTITY_ATTACK: {},
                THREAT: {},
                SEXUALLY_EXPLICIT: {},
            },
            languages: ["en"],
            clientToken: "Polyratings",
        };

        const httpResponse = await fetch(`${ANALYZE_COMMENT_URL}?key=${this.apiKey}`, {
            body: JSON.stringify(requestBody),
            method: "POST",
        });

        if (!httpResponse.ok) {
            throw new Error(JSON.stringify({ status: httpResponse.status, message: httpResponse.statusText }));
        }

        const response = (await httpResponse.json()) as AnalyzeCommentResponse;
        return Object.fromEntries(
            Object.entries(response.attributeScores).map(
                ([
                    key,
                    {
                        summaryScore: { value },
                    },
                ]) => [key, value],
            ),
        );
    }
}

export class PassThroughRatingAnalyzer implements RatingAnalyzer {
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    async analyzeRaring(rating: PendingRating): Promise<AnalyzedRating> {
        return {};
    }
}

interface AnalyzeCommentRequest {
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

type PerspectiveAttributeNames = PerspectiveProductionAttributeNames | PerspectiveExperimentalAttributeNames;

type PerspectiveProductionAttributeNames =
    | "TOXICITY"
    | "SEVERE_TOXICITY"
    | "IDENTITY_ATTACK"
    | "INSULT"
    | "PROFANITY"
    | "THREAT";

type PerspectiveExperimentalAttributeNames =
    | "TOXICITY_EXPERIMENTAL"
    | "SEVERE_TOXICITY_EXPERIMENTAL"
    | "IDENTITY_ATTACK_EXPERIMENTAL"
    | "INSULT_EXPERIMENTAL"
    | "PROFANITY_EXPERIMENTAL"
    | "THREAT_EXPERIMENTAL"
    | "SEXUALLY_EXPLICIT"
    | "FLIRTATION";

interface PerspectiveRequestedAttribute {
    scoreType?: "PROBABILITY";
    scoreThreshold?: number; // needs to be between 0 and 1
}

interface AnalyzeCommentResponse {
    attributeScores: Partial<Record<PerspectiveAttributeNames, PerspectiveAttributeScore>>;
    languages: string[];
    clientToken: string;
}
