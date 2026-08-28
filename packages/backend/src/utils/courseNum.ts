import { z } from "zod";

export const COURSE_NUM_ERROR =
    "Use a 3-digit quarter number (100–599) or a 4-digit semester number (1000–5999)";

export const COURSE_NUM_HINT =
    "Quarter courses are 3 digits (101); Fall 2026+ courses are 4 digits (1101).";

/** Quarter 100–599 or semester 1000–5999. Rejects 600–999, pre-baccalaureate, and CEU ranges. */
export const courseNumParser = z
    .number()
    .int()
    .refine((n) => (n >= 100 && n <= 599) || (n >= 1000 && n <= 5999), {
        error: COURSE_NUM_ERROR,
    });

export function courseReviewsKey(department: string, courseNum: number): string {
    return `${department} ${courseNum}`;
}
