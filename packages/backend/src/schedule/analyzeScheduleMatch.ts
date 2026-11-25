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

        const result = await input.client.matchCourse({
            firstName: input.firstName,
            lastName: input.lastName,
            subject: department,
            catalogNumber: input.courseNum,
            postedAt: input.postDate,
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
