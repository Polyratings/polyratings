import { describe, expect, it, vi } from "vitest";
import {
    analyzePendingProfessorScheduleMatch,
    analyzeScheduleMatch,
    notApplicableMatch,
    submissionMatchesCourseKey,
    termsOverlappingPostDate,
    termsRelevantToPostDate,
    unavailableMatch,
    verdictFromTermMatches,
    type ScheduleMatchClient,
} from "@backend/schedule/analyzeScheduleMatch";
import { approximateTermWindow } from "@backend/schedule/termCalendar";
import type { SectionOffering, TermSummary } from "@backend/schedule/schema";

const FALL_2026 = "2268";
const WINTER_2026 = "2262";

function term(termCode: string, sectionCount = 10): TermSummary {
    return {
        termCode,
        sectionCount,
    };
}

function section(courseKey: string): SectionOffering {
    return { courseKey };
}

describe("approximateTermWindow", () => {
    it("places Fall 2026 from Aug 11 through Dec 31", () => {
        const window = approximateTermWindow(FALL_2026);
        expect(window?.start.toISOString()).toBe("2026-08-11T00:00:00.000Z");
        expect(window?.end.toISOString()).toBe("2026-12-31T00:00:00.000Z");
    });
});

describe("termsOverlappingPostDate", () => {
    const terms = [term(WINTER_2026), term(FALL_2026), term("2264", 0)];

    it("ignores terms with no sections and terms outside the review date", () => {
        expect(
            termsOverlappingPostDate("2026-10-15T18:00:00.000Z", terms).map(
                (item) => item.termCode,
            ),
        ).toEqual([FALL_2026]);
    });

    it("returns nothing for reviews older than every covered term", () => {
        expect(termsOverlappingPostDate("2024-03-01T00:00:00.000Z", terms)).toEqual([]);
    });

    it("returns nothing for an unparseable post date", () => {
        expect(termsOverlappingPostDate("not-a-date", terms)).toEqual([]);
    });
});

describe("termsRelevantToPostDate", () => {
    const spring2027 = "2274";

    it("includes quarter terms that had already started", () => {
        expect(
            termsRelevantToPostDate("2026-10-15T18:00:00.000Z", [
                term(WINTER_2026),
                term("2264"),
                term("2266"),
                term(FALL_2026),
                term(spring2027),
            ]).map((item) => item.termCode),
        ).toEqual([WINTER_2026, "2264", "2266", FALL_2026]);
    });

    it("includes an earlier term when the review is posted later", () => {
        expect(
            termsRelevantToPostDate("2027-04-01T18:00:00.000Z", [
                term(WINTER_2026),
                term(FALL_2026),
                term(spring2027),
            ]).map((item) => item.termCode),
        ).toEqual([WINTER_2026, FALL_2026, spring2027]);
    });

    it("checks the quarter terms that had started by a June review", () => {
        expect(
            termsRelevantToPostDate("2026-06-14T12:00:00.000Z", [
                term(WINTER_2026),
                term("2264"),
                term("2266"),
                term(FALL_2026),
            ]).map((item) => item.termCode),
        ).toEqual([WINTER_2026, "2264"]);
    });

    it("returns nothing when the review is older than coverage", () => {
        expect(
            termsRelevantToPostDate("2024-03-01T00:00:00.000Z", [
                term(WINTER_2026),
                term(FALL_2026),
            ]),
        ).toEqual([]);
    });
});

describe("submissionMatchesCourseKey", () => {
    it("treats semester and catalog keys as the same course", () => {
        expect(submissionMatchesCourseKey("CSC", 1101, "CSC 101")).toBe(true);
        expect(submissionMatchesCourseKey("CSC", 1101, "csc  1101")).toBe(true);
        expect(submissionMatchesCourseKey("CSC", 1101, "CSC 202")).toBe(false);
        expect(submissionMatchesCourseKey("BUS", 387, "BUS 3387")).toBe(true);
        expect(submissionMatchesCourseKey("BUS", 393, "BUS 3393A")).toBe(true);
        expect(submissionMatchesCourseKey("CHEM", 216, "CHEM 216B")).toBe(true);
    });
});

describe("verdictFromTermMatches", () => {
    const base = {
        department: "CSC",
        courseNum: 1101,
        submittedCourseKey: "CSC 1101",
    };

    it("confirms when any checked term taught the submitted course", () => {
        const verdict = verdictFromTermMatches({
            ...base,
            results: [
                {
                    termCode: FALL_2026,
                    outcome: "sections",
                    courseKeys: ["CSC 101", "CSC 202"],
                },
            ],
        });
        expect(verdict.status).toBe("confirmed");
        expect(verdict.matchedCourseKeys).toEqual(["CSC 101", "CSC 202"]);
        expect(verdict.termCodesChecked).toEqual([FALL_2026]);
    });

    it("flags course_not_taught only when matches exist and the course is absent", () => {
        expect(
            verdictFromTermMatches({
                ...base,
                results: [
                    {
                        termCode: FALL_2026,
                        outcome: "sections",
                        courseKeys: ["CSC 202"],
                    },
                ],
            }).status,
        ).toBe("course_not_taught");
    });

    it("is not_applicable when the professor has no sections in covered terms", () => {
        expect(
            verdictFromTermMatches({
                ...base,
                results: [
                    {
                        termCode: FALL_2026,
                        outcome: "not_found",
                        courseKeys: [],
                    },
                ],
            }).status,
        ).toBe("not_applicable");
    });

    it("is unavailable instead of a mismatch when a term fetch fails", () => {
        expect(
            verdictFromTermMatches({
                ...base,
                results: [
                    {
                        termCode: FALL_2026,
                        outcome: "error",
                        courseKeys: [],
                    },
                    {
                        termCode: WINTER_2026,
                        outcome: "sections",
                        courseKeys: ["CSC 202"],
                    },
                ],
            }).status,
        ).toBe("unavailable");
    });

    it("stays confirmed if another term already proved the course", () => {
        expect(
            verdictFromTermMatches({
                ...base,
                results: [
                    {
                        termCode: FALL_2026,
                        outcome: "error",
                        courseKeys: [],
                    },
                    {
                        termCode: WINTER_2026,
                        outcome: "sections",
                        courseKeys: ["CSC 1101"],
                    },
                ],
            }).status,
        ).toBe("confirmed");
    });
});

describe("analyzeScheduleMatch", () => {
    it("does not call the API when it is not configured", async () => {
        const listTerms = vi.fn<ScheduleMatchClient["listTerms"]>();
        const client: ScheduleMatchClient = {
            isConfigured: false,
            listTerms,
            matchProfessorInTerm: vi.fn<ScheduleMatchClient["matchProfessorInTerm"]>(),
        };

        await expect(
            analyzeScheduleMatch({
                client,
                firstName: "Ada",
                lastName: "Lovelace",
                department: "csc",
                courseNum: 1101,
                postDate: "2026-10-15T00:00:00.000Z",
            }),
        ).resolves.toEqual(unavailableMatch("CSC 1101"));
        expect(listTerms).not.toHaveBeenCalled();
    });

    it("is not_applicable for reviews outside covered terms and does not match instructors", async () => {
        const matchProfessorInTerm = vi.fn<ScheduleMatchClient["matchProfessorInTerm"]>();
        const client: ScheduleMatchClient = {
            isConfigured: true,
            listTerms: async () => [term(FALL_2026)],
            matchProfessorInTerm,
        };

        await expect(
            analyzeScheduleMatch({
                client,
                firstName: "Ada",
                lastName: "Lovelace",
                department: "CSC",
                courseNum: 1101,
                postDate: "2020-01-01T00:00:00.000Z",
            }),
        ).resolves.toEqual(notApplicableMatch("CSC 1101"));
        expect(matchProfessorInTerm).not.toHaveBeenCalled();
    });

    it("confirms a course taught in an earlier semester when the review is posted later", async () => {
        const spring2027 = "2274";
        const matchProfessorInTerm = vi.fn<ScheduleMatchClient["matchProfessorInTerm"]>(
            async (termCode) => {
                if (termCode === FALL_2026) {
                    return { status: "ok", data: [section("CSC 1101")] };
                }
                return { status: "ok", data: [section("CSC 202")] };
            },
        );
        const client: ScheduleMatchClient = {
            isConfigured: true,
            listTerms: async () => [term(FALL_2026), term(WINTER_2026), term(spring2027)],
            matchProfessorInTerm,
        };

        const scheduleMatch = await analyzeScheduleMatch({
            client,
            firstName: "Ada",
            lastName: "Lovelace",
            department: "CSC",
            courseNum: 1101,
            postDate: "2027-04-01T00:00:00.000Z",
        });

        expect(scheduleMatch.status).toBe("confirmed");
        expect(matchProfessorInTerm.mock.calls.map((call) => call[0]).sort()).toEqual([
            WINTER_2026,
            FALL_2026,
            spring2027,
        ]);
    });

    it("confirms a quarter course from a 3-digit section", async () => {
        const client: ScheduleMatchClient = {
            isConfigured: true,
            listTerms: async () => [term(WINTER_2026), term("2264")],
            matchProfessorInTerm: async () => ({
                status: "ok",
                data: [section("EE 307"), section("EE 3306")],
            }),
        };

        const scheduleMatch = await analyzeScheduleMatch({
            client,
            firstName: "Anu",
            lastName: "Aggarwal",
            department: "EE",
            courseNum: 307,
            postDate: "2026-06-14T12:00:00.000Z",
        });

        expect(scheduleMatch.status).toBe("confirmed");
        expect(scheduleMatch.matchedCourseKeys).toEqual(["EE 307", "EE 3306"]);
    });

    it("confirms a course taught in the overlapping term", async () => {
        const client: ScheduleMatchClient = {
            isConfigured: true,
            listTerms: async () => [term(FALL_2026)],
            matchProfessorInTerm: async () => ({
                status: "ok",
                data: [section("CSC 1101")],
            }),
        };

        const scheduleMatch = await analyzeScheduleMatch({
            client,
            firstName: "Ada",
            lastName: "Lovelace",
            department: "CSC",
            courseNum: 1101,
            postDate: "2026-10-15T00:00:00.000Z",
        });

        expect(scheduleMatch.status).toBe("confirmed");
        expect(scheduleMatch.submittedCourseKey).toBe("CSC 1101");
    });

    it("returns unavailable when listing terms throws", async () => {
        const client: ScheduleMatchClient = {
            isConfigured: true,
            listTerms: async () => {
                throw new Error("down");
            },
            matchProfessorInTerm: vi.fn<ScheduleMatchClient["matchProfessorInTerm"]>(),
        };

        await expect(
            analyzeScheduleMatch({
                client,
                firstName: "Ada",
                lastName: "Lovelace",
                department: "CSC",
                courseNum: 1101,
                postDate: "2026-10-15T00:00:00.000Z",
            }),
        ).resolves.toEqual(unavailableMatch("CSC 1101"));
    });
});

describe("analyzePendingProfessorScheduleMatch", () => {
    it("matches the first review against the pending name", async () => {
        const matchProfessorInTerm = vi.fn<ScheduleMatchClient["matchProfessorInTerm"]>(
            async () => ({
                status: "ok",
                data: [section("CSC 1101")],
            }),
        );
        const client: ScheduleMatchClient = {
            isConfigured: true,
            listTerms: async () => [term(FALL_2026)],
            matchProfessorInTerm,
        };

        const scheduleMatch = await analyzePendingProfessorScheduleMatch(client, {
            firstName: "Ada",
            lastName: "Lovelace",
            reviews: {
                "CSC 1101": [{ postDate: "2026-10-15T00:00:00.000Z" }],
                "CSC 202": [{ postDate: "2026-10-15T00:00:00.000Z" }],
            },
        });

        expect(scheduleMatch?.status).toBe("confirmed");
        expect(scheduleMatch?.submittedCourseKey).toBe("CSC 1101");
        expect(matchProfessorInTerm).toHaveBeenCalledWith(FALL_2026, "Ada", "Lovelace");
    });

    it("returns not applicable when the course key cannot be parsed", async () => {
        const listTerms = vi.fn<ScheduleMatchClient["listTerms"]>();
        const client: ScheduleMatchClient = {
            isConfigured: true,
            listTerms,
            matchProfessorInTerm: vi.fn<ScheduleMatchClient["matchProfessorInTerm"]>(),
        };

        await expect(
            analyzePendingProfessorScheduleMatch(client, {
                firstName: "Ada",
                lastName: "Lovelace",
                reviews: {
                    "not-a-course": [{ postDate: "2026-10-15T00:00:00.000Z" }],
                },
            }),
        ).resolves.toEqual(notApplicableMatch("not-a-course"));
        expect(listTerms).not.toHaveBeenCalled();
    });

    it("returns undefined when there is no review to check", async () => {
        const client: ScheduleMatchClient = {
            isConfigured: true,
            listTerms: vi.fn<ScheduleMatchClient["listTerms"]>(),
            matchProfessorInTerm: vi.fn<ScheduleMatchClient["matchProfessorInTerm"]>(),
        };

        await expect(
            analyzePendingProfessorScheduleMatch(client, {
                firstName: "Ada",
                lastName: "Lovelace",
                reviews: {},
            }),
        ).resolves.toBeUndefined();
    });
});
