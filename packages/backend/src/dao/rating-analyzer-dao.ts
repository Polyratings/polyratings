import { PendingRating } from "@backend/types/schema";
import OpenAI from "openai";
import type { Moderation } from "openai/resources/moderations";

export type RatingAnalyzer = {
    analyzeRating(rating: PendingRating): Promise<Moderation | undefined>;
    analyzeRatings(rating: PendingRating[]): Promise<(Moderation | undefined)[]>;
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
            return (await this.analyzeRatings([rating]))[0];
        } catch (err) {
            // Don't block submission on OpenAI failures, but log the error for monitoring
            // eslint-disable-next-line no-console
            console.error("OpenAI moderation API error:", err);
            return undefined;
        }
    }

    async analyzeRatings(ratings: PendingRating[]) {
        const moderation = await this.openai.moderations.create({
            model: "omni-moderation-latest",
            input: ratings.map((r) => r.rating),
        });

        return moderation.results;
    }
}
export class PassThroughRatingAnalyzer implements RatingAnalyzer {
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    async analyzeRating(_: PendingRating) {
        return undefined;
    }

    // eslint-disable-next-line class-methods-use-this
    async analyzeRatings(ratings: PendingRating[]) {
        const arr: (Moderation | undefined)[] = [];
        return arr.fill(undefined, 0, ratings.length);
    }
}
