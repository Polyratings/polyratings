import { PendingRating } from "@backend/types/schema";
import OpenAI from "openai";
import type { Moderation } from "openai/resources/moderations";

export type RatingAnalyzer = {
    analyzeRating(rating: PendingRating): Promise<Moderation | null>;
};

export class OpenAIDAO implements RatingAnalyzer {
    private openai: OpenAI;

    constructor(apiKey: string, accountId: string, gatewayId: string) {
        this.openai = new OpenAI({
            apiKey,
            baseURL: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openai`,
        });
    }

    async analyzeRating(rating: PendingRating) {
        try {
            const moderation = await this.openai.moderations.create({
                model: "omni-moderation-latest",
                input: rating.rating,
            });

            return moderation.results[0];
        } catch {
            // Don't block submission on OpenAI failures
            return null;
        }
    }
}
export class PassThroughRatingAnalyzer implements RatingAnalyzer {
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    async analyzeRating(_: PendingRating) {
        return null;
    }
}
