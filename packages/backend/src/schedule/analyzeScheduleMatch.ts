import { courseReviewsKey } from "@backend/utils/courseNum";
import { scheduleCourseKeyCandidates } from "@backend/schedule/courseKeys";
import type { ScheduleFetchResult } from "@backend/schedule/client";
import type { ScheduleMatch, SectionOffering, TermSummary } from "@backend/schedule/schema";
import { approximateTermWindow, isInstantInTermWindow } from "@backend/schedule/termCalendar";

const COURSE_KEY = /^([A-Za-z]+)\s+(\d+)$/;

export type ScheduleMatchClient = {
    isConfigured: boolean;
    listTerms(): Promise<TermSummary[] | null>;
    matchProfessorInTerm(
        termCode: string,
        firstName: string,
        lastName: string,
    ): Promise<ScheduleFetchResult<SectionOffering[]>>;
};

export type TermMatchOutcome = "sections" | "not_found" | "error";

export type TermMatchResult = {
    termCode: string;
    outcome: TermMatchOutcome;
    courseKeys: string[];
};

export function parseSubmittedCourseKey(
    courseKey: string,
): { department: string; courseNum: number } | null {
    const match = courseKey.trim().match(COURSE_KEY);
    if (!match) {
        return null;
    }

    const courseNum = Number(match[2]);
    if (!Number.isInteger(courseNum)) {
        return null;
    }

    return { department: match[1].toUpperCase(), courseNum };
}

export function normalizeCourseKey(courseKey: string): string {
    return courseKey.trim().replace(/\s+/g, " ").toUpperCase();
}

export function submissionMatchesCourseKey(
    department: string,
    courseNum: number,
    courseKey: string,
): boolean {
    const normalized = normalizeCourseKey(courseKey);
    const candidates = scheduleCourseKeyCandidates(department, courseNum).map((candidate) =>
        candidate.toUpperCase(),
    );
    if (candidates.includes(normalized)) {
        return true;
    }

    // Activity and lab sections keep the course number and add a letter (CHEM 216B, BUS 3393A).
    const withoutSectionSuffix = normalized.replace(/(\d)[A-Z]+$/, "$1");
    return withoutSectionSuffix !== normalized && candidates.includes(withoutSectionSuffix);
}

export function notApplicableMatch(submittedCourseKey: string): ScheduleMatch {
    return {
        status: "not_applicable",
        termCodesChecked: [],
        matchedCourseKeys: [],
        submittedCourseKey,
    };
}

export function unavailableMatch(submittedCourseKey: string): ScheduleMatch {
    return {
        status: "unavailable",
        termCodesChecked: [],
        matchedCourseKeys: [],
        submittedCourseKey,
    };
}

function coveredTerms(terms: TermSummary[]): TermSummary[] {
    return terms.filter(
        (term) => term.sectionCount > 0 && approximateTermWindow(term.termCode) != null,
    );
}

/** Covered terms whose window contains postDate. Empty when the review is outside our data. */
export function termsOverlappingPostDate(postDate: string, terms: TermSummary[]): TermSummary[] {
    const post = new Date(postDate);
    if (Number.isNaN(post.getTime())) {
        return [];
    }

    return coveredTerms(terms).filter((term) => {
        const window = approximateTermWindow(term.termCode);
        return window != null && isInstantInTermWindow(post, window);
    });
}

/**
 * Terms to search once the review date is inside coverage.
 * Includes every covered term that has already started, not only the term the
 * review was posted in, so a rating during a new term still counts a course
 * from an earlier term we have. Terms that have not started yet are skipped.
 */
export function termsRelevantToPostDate(postDate: string, terms: TermSummary[]): TermSummary[] {
    const post = new Date(postDate);
    if (Number.isNaN(post.getTime()) || termsOverlappingPostDate(postDate, terms).length === 0) {
        return [];
    }

    return coveredTerms(terms)
        .filter((term) => {
            const window = approximateTermWindow(term.termCode);
            return window != null && window.start.getTime() <= post.getTime();
        })
        .sort((a, b) => a.termCode.localeCompare(b.termCode));
}

/**
 * Decide whether the submitted course matches stored sections from instructor-match results.
 * A failed term fetch never produces course_not_taught — missing evidence is unavailable.
 * No matched sections is not_applicable (insufficient evidence), not a mismatch.
 */
export function verdictFromTermMatches(input: {
    department: string;
    courseNum: number;
    submittedCourseKey: string;
    results: TermMatchResult[];
}): ScheduleMatch {
    const matchedCourseKeys = new Set<string>();
    let sawError = false;
    let confirmed = false;
    let sawSections = false;

    for (const result of input.results) {
        if (result.outcome === "error") {
            sawError = true;
            continue;
        }
        if (result.outcome !== "sections" || result.courseKeys.length === 0) {
            continue;
        }

        sawSections = true;
        for (const courseKey of result.courseKeys) {
            matchedCourseKeys.add(normalizeCourseKey(courseKey));
            if (submissionMatchesCourseKey(input.department, input.courseNum, courseKey)) {
                confirmed = true;
            }
        }
    }

    const base = {
        termCodesChecked: input.results.map((result) => result.termCode),
        matchedCourseKeys: [...matchedCourseKeys].sort(),
        submittedCourseKey: input.submittedCourseKey,
    };

    if (confirmed) {
        return { ...base, status: "confirmed" };
    }
    if (sawError) {
        return { ...base, status: "unavailable" };
    }
    if (!sawSections) {
        return { ...base, status: "not_applicable", matchedCourseKeys: [] };
    }
    return { ...base, status: "course_not_taught" };
}

/** Schedule check for the first review on a pending professor. Undefined when there is no review. */
export async function analyzePendingProfessorScheduleMatch(
    client: ScheduleMatchClient,
    professor: {
        firstName: string;
        lastName: string;
        reviews: Record<string, readonly { postDate: string }[]>;
    },
): Promise<ScheduleMatch | undefined> {
    const [courseKey, reviews] = Object.entries(professor.reviews)[0] ?? [];
    const postDate = reviews?.[0]?.postDate;
    if (!courseKey || !postDate) {
        return undefined;
    }

    const parsed = parseSubmittedCourseKey(courseKey);
    if (!parsed) {
        return notApplicableMatch(courseKey);
    }

    return analyzeScheduleMatch({
        client,
        firstName: professor.firstName,
        lastName: professor.lastName,
        department: parsed.department,
        courseNum: parsed.courseNum,
        postDate,
    });
}

export async function analyzeScheduleMatch(input: {
    client: ScheduleMatchClient;
    firstName: string;
    lastName: string;
    department: string;
    courseNum: number;
    postDate: string;
}): Promise<ScheduleMatch> {
    const department = input.department.toUpperCase();
    const submittedCourseKey = courseReviewsKey(department, input.courseNum);

    try {
        if (!input.client.isConfigured) {
            return unavailableMatch(submittedCourseKey);
        }

        const terms = await input.client.listTerms();
        if (!terms) {
            return unavailableMatch(submittedCourseKey);
        }

        const relevant = termsRelevantToPostDate(input.postDate, terms);
        if (relevant.length === 0) {
            return notApplicableMatch(submittedCourseKey);
        }

        const results = await Promise.all(
            relevant.map(async (term): Promise<TermMatchResult> => {
                const match = await input.client.matchProfessorInTerm(
                    term.termCode,
                    input.firstName,
                    input.lastName,
                );
                if (match.status === "error") {
                    return {
                        termCode: term.termCode,
                        outcome: "error",
                        courseKeys: [],
                    };
                }
                if (match.status === "not_found" || match.data.length === 0) {
                    return {
                        termCode: term.termCode,
                        outcome: "not_found",
                        courseKeys: [],
                    };
                }
                return {
                    termCode: term.termCode,
                    outcome: "sections",
                    courseKeys: match.data.map((section) => section.courseKey),
                };
            }),
        );

        return verdictFromTermMatches({
            department,
            courseNum: input.courseNum,
            submittedCourseKey,
            results,
        });
    } catch {
        return unavailableMatch(submittedCourseKey);
    }
}
