import { Internal } from "@polyratings/shared";

const ANALYZE_COMMENT_URL = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";

export class PerspectiveDAO {
    constructor(private readonly apiKey: string) {}

    async analyzeReview(
        review: Internal.PendingReviewDTO,
    ): Promise<Internal.AnalyzeCommentResponse> {
        // TODO: Perhaps we should define a default request?
        const requestBody: Internal.AnalyzeCommentRequest = {
            comment: {
                text: review.rating,
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

        if (httpResponse.status !== 200) {
            throw new Error(
                JSON.stringify({ status: httpResponse.status, message: httpResponse.statusText }),
            );
        }

        return httpResponse.json();
    }
}
