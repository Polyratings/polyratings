import { z } from "zod";

export const COURSE_NUM_ERROR = "Use a 4-digit course number (1000–5999)";

export const COURSE_NUM_HINT = "Fall 2026+ courses use 4 digits (for example 1101).";

/** Semester course numbers are 1000–5999. Rejects quarter, pre-baccalaureate, and CEU ranges. */
export function isSemesterCourseNum(n: number): boolean {
    return Number.isInteger(n) && n >= 1000 && n <= 5999;
}

/** Quarter 100–599 or semester 1000–5999. For reading stored ratings/logs. */
export function isHistoricalCourseNum(n: number): boolean {
    return Number.isInteger(n) && ((n >= 100 && n <= 599) || (n >= 1000 && n <= 5999));
}

/** Course review keys look like `PHIL 2231`. */
export function isSemesterCourseKey(courseKey: string): boolean {
    const courseNum = parseInt(courseKey.split(" ")[1] ?? "", 10);
    return isSemesterCourseNum(courseNum);
}

/** New submissions: 4-digit semester numbers only. */
export const courseNumParser = z.number().int().refine(isSemesterCourseNum, {
    error: COURSE_NUM_ERROR,
});

/**
 * Stored rating logs and in-memory analysis stubs may still carry quarter numbers.
 * Do not use this for new public submissions.
 */
export const historicalCourseNumParser = z.number().int().refine(isHistoricalCourseNum, {
    error: "Use a 3-digit quarter number (100–599) or a 4-digit semester number (1000–5999)",
});

export function courseReviewsKey(department: string, courseNum: number): string {
    return `${department} ${courseNum}`;
}
