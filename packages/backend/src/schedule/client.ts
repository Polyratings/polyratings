import { type CourseMatchResponse, courseMatchResponseParser } from "@backend/schedule/schema";

export type ScheduleFetchResult<T> = { status: "ok"; data: T } | { status: "error" };

export type CourseMatchQuery = {
    /** Omitted from the request when blank; Polyratings allows empty first names. */
    firstName: string;
    lastName: string;
    subject: string;
    catalogNumber: number;
    /** ISO timestamp of the rating. */
    postedAt: string;
};

/**
 * The check runs inline on rating submission, before moderation, so a slow
 * Schedule API must not hold up the user. Past this, the result is `unavailable`.
 */
export const SCHEDULE_FETCH_TIMEOUT_MS = 2500;

const COURSE_MATCH_PATH = "/v1/instructors/course-match";

export class ScheduleApiClient {
    constructor(
        private readonly baseUrl: string | undefined,
        private readonly apiKey: string | undefined,
        private readonly timeoutMs = SCHEDULE_FETCH_TIMEOUT_MS,
    ) {}

    get isConfigured(): boolean {
        return Boolean(this.baseUrl?.trim() && this.apiKey?.trim());
    }

    private normalizedBaseUrl(): string {
        return this.baseUrl!.replace(/\/$/, "");
    }

    /**
     * Any non-200 response, network error, timeout, or unexpected body is an error.
     * Only `path` is logged, never the query: it carries professor names.
     */
    private async fetchJson<T>(
        path: string,
        params: URLSearchParams,
        parse: (json: unknown) => T,
        isExpectedClientError: (status: number) => boolean = () => false,
    ): Promise<ScheduleFetchResult<T>> {
        if (!this.isConfigured) {
            return { status: "error" };
        }

        let response: Response;
        try {
            response = await fetch(`${this.normalizedBaseUrl()}${path}?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
                signal: AbortSignal.timeout(this.timeoutMs),
            });
        } catch (error) {
            const reason =
                error instanceof Error && error.name === "TimeoutError"
                    ? `timed out after ${this.timeoutMs}ms`
                    : "network error";
            // eslint-disable-next-line no-console
            console.warn(`Schedule API ${path} unavailable: ${reason}`);
            return { status: "error" };
        }

        if (response.status !== 200) {
            const isClientError = response.status >= 400 && response.status < 500;
            if (isClientError && !isExpectedClientError(response.status)) {
                // A 4xx means Polyratings sent a request the API rejects (contract or
                // config bug), not an outage. Logged so it shows in Workers tails / Sentry.
                // eslint-disable-next-line no-console
                console.error(`Schedule API ${path} rejected the request: HTTP ${response.status}`);
            } else {
                // eslint-disable-next-line no-console
                console.warn(`Schedule API ${path} unavailable: HTTP ${response.status}`);
            }
            return { status: "error" };
        }

        try {
            const json: unknown = await response.json();
            return { status: "ok", data: parse(json) };
        } catch {
            // eslint-disable-next-line no-console
            console.error(`Schedule API ${path} returned an unexpected body`);
            return { status: "error" };
        }
    }

    /**
     * Whether the instructor taught the course in any covered term that started
     * by `postedAt`. One request; the Schedule API owns term windows and course-key aliases.
     */
    async matchCourse(query: CourseMatchQuery): Promise<ScheduleFetchResult<CourseMatchResponse>> {
        const firstName = query.firstName.trim();
        const params = new URLSearchParams();
        if (firstName) {
            params.set("firstName", firstName);
        }
        params.set("lastName", query.lastName);
        params.set("subject", query.subject);
        params.set("catalogNumber", String(query.catalogNumber));
        params.set("postedAt", query.postedAt);

        return this.fetchJson(
            COURSE_MATCH_PATH,
            params,
            (json) => courseMatchResponseParser.parse(json),
            // Until the Schedule API makes firstName optional it answers 400 when the
            // param is omitted. Expected for those professors, not a contract bug.
            (status) => status === 400 && !firstName,
        );
    }
}
