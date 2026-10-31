import {
    instructorMatchResponseParser,
    type SectionOffering,
    termsListResponseParser,
    type TermSummary,
} from "@backend/schedule/schema";

export type ScheduleFetchResult<T> =
    | { status: "ok"; data: T }
    | { status: "not_found" }
    | { status: "error" };

type FetchResult<T> = ScheduleFetchResult<T>;

export class ScheduleApiClient {
    constructor(
        private readonly baseUrl: string | undefined,
        private readonly apiKey: string | undefined,
    ) {}

    get isConfigured(): boolean {
        return Boolean(this.baseUrl?.trim() && this.apiKey?.trim());
    }

    private normalizedBaseUrl(): string {
        return this.baseUrl!.replace(/\/$/, "");
    }

    private async fetchJson<T>(path: string, parse: (json: unknown) => T): Promise<FetchResult<T>> {
        if (!this.isConfigured) {
            return { status: "error" };
        }

        try {
            const response = await fetch(`${this.normalizedBaseUrl()}${path}`, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });

            if (response.status === 404) {
                return { status: "not_found" };
            }

            if (!response.ok) {
                return { status: "error" };
            }

            const json: unknown = await response.json();
            return { status: "ok", data: parse(json) };
        } catch {
            return { status: "error" };
        }
    }

    async listTerms(): Promise<TermSummary[] | null> {
        const result = await this.fetchJson("/v1/terms", (json) =>
            termsListResponseParser.parse(json),
        );
        if (result.status !== "ok") {
            return null;
        }
        return result.data.terms;
    }

    /** Instructor sections for one term. Does not pick a default term. */
    async matchProfessorInTerm(
        termCode: string,
        firstName: string,
        lastName: string,
    ): Promise<ScheduleFetchResult<SectionOffering[]>> {
        const params = new URLSearchParams({
            firstName,
            lastName,
        });
        const result = await this.fetchJson(
            `/v1/terms/${encodeURIComponent(termCode)}/instructors/match?${params.toString()}`,
            (json) => instructorMatchResponseParser.parse(json),
        );

        if (result.status !== "ok") {
            return result;
        }

        return { status: "ok", data: result.data.sections };
    }
}
