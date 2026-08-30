import { scheduleCourseKeyCandidates } from "@backend/schedule/courseKeys";
import {
    courseSectionsResponseParser,
    instructorMatchResponseParser,
    type ScheduleSectionsResult,
    type SectionOffering,
    termsListResponseParser,
    type TermSummary,
} from "@backend/schedule/schema";

type FetchResult<T> = { status: "ok"; data: T } | { status: "not_found" } | { status: "error" };

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

    async resolveDefaultTermCode(): Promise<string | null> {
        const terms = await this.listTerms();
        if (!terms?.length) {
            return null;
        }

        const withData = terms.filter((term) => term.sectionCount > 0);
        const candidates = withData.length > 0 ? withData : terms;

        const sorted = [...candidates].sort((a, b) => {
            const aTime = a.lastScrapedAt ? Date.parse(a.lastScrapedAt) : 0;
            const bTime = b.lastScrapedAt ? Date.parse(b.lastScrapedAt) : 0;
            if (bTime !== aTime) {
                return bTime - aTime;
            }
            return b.termCode.localeCompare(a.termCode);
        });

        return sorted[0]?.termCode ?? null;
    }

    async getCourseSections(
        termCode: string,
        courseKey: string,
    ): Promise<FetchResult<{ sections: SectionOffering[]; courseKey: string }>> {
        const encodedKey = encodeURIComponent(courseKey);
        const result = await this.fetchJson(
            `/v1/terms/${encodeURIComponent(termCode)}/courses/${encodedKey}`,
            (json) => courseSectionsResponseParser.parse(json),
        );

        if (result.status !== "ok") {
            return result;
        }

        return {
            status: "ok",
            data: {
                courseKey: result.data.courseKey,
                sections: result.data.sections,
            },
        };
    }

    async getSectionsForCourse(input: {
        department: string;
        courseNum: number;
        termCode?: string;
    }): Promise<ScheduleSectionsResult> {
        if (!this.isConfigured) {
            return {
                available: false,
                reason: "not_configured",
                sections: [],
            };
        }

        const termCode = input.termCode ?? (await this.resolveDefaultTermCode());
        if (!termCode) {
            return {
                available: false,
                reason: "unavailable",
                sections: [],
            };
        }

        const terms = await this.listTerms();
        const termMeta = terms?.find((term) => term.termCode === termCode);
        const candidateKeys = scheduleCourseKeyCandidates(input.department, input.courseNum);

        const sectionResults = await Promise.all(
            candidateKeys.map(async (courseKey) => ({
                courseKey,
                result: await this.getCourseSections(termCode, courseKey),
            })),
        );

        const matched = sectionResults.find(
            ({ result }) => result.status === "ok" && result.data.sections.length > 0,
        );

        if (matched?.result.status === "ok") {
            return {
                available: true,
                reason: "ok",
                termCode,
                termLabel: termMeta?.label,
                courseKey: matched.result.data.courseKey,
                scrapedAt: termMeta?.lastScrapedAt ?? null,
                sections: matched.result.data.sections,
            };
        }

        return {
            available: false,
            reason: "not_found",
            termCode,
            termLabel: termMeta?.label,
            scrapedAt: termMeta?.lastScrapedAt ?? null,
            sections: [],
        };
    }

    async getSectionsForProfessor(input: {
        firstName: string;
        lastName: string;
        termCode?: string;
    }): Promise<ScheduleSectionsResult> {
        if (!this.isConfigured) {
            return {
                available: false,
                reason: "not_configured",
                sections: [],
            };
        }

        const termCode = input.termCode ?? (await this.resolveDefaultTermCode());
        if (!termCode) {
            return {
                available: false,
                reason: "unavailable",
                sections: [],
            };
        }

        const terms = await this.listTerms();
        const termMeta = terms?.find((term) => term.termCode === termCode);
        const scrapedAt = termMeta?.lastScrapedAt ?? null;
        const termLabel = termMeta?.label;

        const params = new URLSearchParams({
            firstName: input.firstName,
            lastName: input.lastName,
        });
        const result = await this.fetchJson(
            `/v1/terms/${encodeURIComponent(termCode)}/instructors/match?${params}`,
            (json) => instructorMatchResponseParser.parse(json),
        );

        if (result.status === "not_found") {
            return {
                available: false,
                reason: "not_found",
                termCode,
                termLabel,
                scrapedAt,
                sections: [],
            };
        }

        if (result.status !== "ok") {
            return {
                available: false,
                reason: "unavailable",
                termCode,
                termLabel,
                scrapedAt,
                sections: [],
            };
        }

        const sections = [...result.data.sections].sort((a, b) => {
            const courseCompare = a.courseKey.localeCompare(b.courseKey);
            if (courseCompare !== 0) {
                return courseCompare;
            }
            return a.section.localeCompare(b.section);
        });

        return {
            available: true,
            reason: "ok",
            termCode,
            termLabel,
            scrapedAt,
            sections,
        };
    }
}
