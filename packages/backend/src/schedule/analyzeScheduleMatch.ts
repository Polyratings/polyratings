import { courseReviewsKey } from "@backend/utils/courseNum";
import type { CourseMatchQuery, ScheduleFetchResult } from "@backend/schedule/client";
import type { CourseMatchResponse, ScheduleMatch } from "@backend/schedule/schema";

const COURSE_KEY = /^([A-Za-z]+)\s+(\d+)$/;

export type ScheduleMatchClient = {
    isConfigured: boolean;
    matchCourse(query: CourseMatchQuery): Promise<ScheduleFetchResult<CourseMatchResponse>>;
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

/**
 * A stored result worth reusing instead of asking the Schedule API again.
 * `unavailable` means the check never ran (outage, timeout, misconfig), so it is
 * treated as missing and re-checked.
 */
export function reusableScheduleMatch(
    stored: ScheduleMatch | undefined,
): ScheduleMatch | undefined {
    return stored?.status === "unavailable" ? undefined : stored;
}

/**
 * Ask the Schedule API whether the professor taught the submitted course in any
 * covered term that had started by the post date. The API decides coverage and
 * matching; failures are `unavailable` and never block the rating.
 */
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

        // Older ratings store Date#toString() output; the API only accepts ISO 8601.
        const postedAt = new Date(input.postDate);
        if (Number.isNaN(postedAt.getTime())) {
            return notApplicableMatch(submittedCourseKey);
        }

        const result = await input.client.matchCourse({
            firstName: input.firstName,
            lastName: input.lastName,
            subject: department,
            catalogNumber: input.courseNum,
            postedAt: postedAt.toISOString(),
        });
        if (result.status !== "ok") {
            return unavailableMatch(submittedCourseKey);
        }

        return {
            status: result.data.status,
            termCodesChecked: result.data.termCodesChecked,
            matchedCourseKeys: result.data.matchedCourseKeys,
            submittedCourseKey,
        };
    } catch {
        return unavailableMatch(submittedCourseKey);
    }
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
