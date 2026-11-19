import { PendingRating } from "@backend/types/schema";
import OpenAI from "openai";
import type { Moderation } from "openai/resources/moderations";

export type RatingAnalyzer = {
    analyzeRating(rating: PendingRating): Promise<Moderation | undefined>;
    analyzeRatings(ratings: PendingRating[]): Promise<(Moderation | undefined)[]>;
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
        return (await this.analyzeRatings([rating]))[0];
    }

    async analyzeRatings(ratings: PendingRating[]) {
        // Keep request size bounded; moderation accepts arrays but large batches
        // are more likely to hit gateway/payload limits and fail the whole set.
        const CHUNK_SIZE = 32;
        const results: (Moderation | undefined)[] = [];

        for (let i = 0; i < ratings.length; i += CHUNK_SIZE) {
            const chunk = ratings.slice(i, i + CHUNK_SIZE);
            try {
                // eslint-disable-next-line no-await-in-loop -- sequential chunks avoid bursting the gateway
                const moderation = await this.openai.moderations.create({
                    model: "omni-moderation-latest",
                    input: chunk.map((r) => r.rating),
                });
                results.push(...moderation.results);
            } catch (err) {
                // Don't block on OpenAI failures, but log the error for monitoring
                // eslint-disable-next-line no-console
                console.error("OpenAI moderation API error:", err);
                results.push(...chunk.map(() => undefined));
            }
        }

        return results;
    }
}
export class PassThroughRatingAnalyzer implements RatingAnalyzer {
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    async analyzeRating(_: PendingRating) {
        return undefined;
    }

    // eslint-disable-next-line class-methods-use-this
    async analyzeRatings(ratings: PendingRating[]) {
        return ratings.map(() => undefined);
    }
}
