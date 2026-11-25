import { type CourseMatchResponse, courseMatchResponseParser } from "@backend/schedule/schema";

export type ScheduleFetchResult<T> = { status: "ok"; data: T } | { status: "error" };

export type CourseMatchQuery = {
    firstName: string;
    lastName: string;
    subject: string;
    catalogNumber: number;
    /** ISO timestamp of the rating. */
    postedAt: string;
};

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

    /** Any non-200 response, network error, or unexpected body is an error. */
    private async fetchJson<T>(
        path: string,
        parse: (json: unknown) => T,
    ): Promise<ScheduleFetchResult<T>> {
        if (!this.isConfigured) {
            return { status: "error" };
        }

        try {
            const response = await fetch(`${this.normalizedBaseUrl()}${path}`, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });

            if (response.status !== 200) {
                return { status: "error" };
            }

            const json: unknown = await response.json();
            return { status: "ok", data: parse(json) };
        } catch {
            return { status: "error" };
        }
    }

    /**
     * Whether the instructor taught the course in any covered term that started
     * by `postedAt`. One request; the Schedule API owns term windows and course-key aliases.
     */
    async matchCourse(query: CourseMatchQuery): Promise<ScheduleFetchResult<CourseMatchResponse>> {
        const params = new URLSearchParams({
            firstName: query.firstName,
            lastName: query.lastName,
            subject: query.subject,
            catalogNumber: String(query.catalogNumber),
            postedAt: query.postedAt,
        });
        return this.fetchJson(`/v1/instructors/course-match?${params.toString()}`, (json) =>
            courseMatchResponseParser.parse(json),
        );
    }
}
