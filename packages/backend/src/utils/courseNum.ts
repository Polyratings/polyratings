import { z } from "zod";
import { DEPARTMENT_LIST } from "@backend/utils/const";

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

/**
 * Admin input naming a review bucket, e.g. `csc 1001` -> `CSC 1001`. Accepts a current
 * department and a quarter or semester number. Only for new keys: stored reviews still use
 * retired prefixes (SPC, CRSC, FNR, IT, ...), so never validate existing review keys with this.
 */
export const courseKeyParser = z
    .string()
    .trim()
    .transform((value, ctx) => {
        const [department, courseNum, ...rest] = value.toUpperCase().split(/\s+/);
        const departmentResult = z.enum(DEPARTMENT_LIST).safeParse(department);
        const courseNumResult = historicalCourseNumParser.safeParse(Number(courseNum));
        if (rest.length > 0 || !departmentResult.success || !courseNumResult.success) {
            ctx.addIssue({
                code: "custom",
                message:
                    'Course must look like "DEPT NUM" with a known department (e.g. "CSC 1001").',
            });
            return z.NEVER;
        }
        return courseReviewsKey(departmentResult.data, courseNumResult.data);
    });
