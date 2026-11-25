import { z } from "zod";
import {
    COURSE_TYPES,
    DEPARTMENT_LIST,
    GRADES,
    GRADE_LEVELS,
    MAX_PROFESSOR_TAGS_PER_RATING,
    PENDING_RATING_STATUSES,
    PROFESSOR_TAGS,
} from "@backend/utils/const";
import { historicalCourseNumParser, isCourseKey } from "@backend/utils/courseNum";
import { scheduleMatchParser } from "@backend/schedule/schema";
import type { Moderation } from "openai/resources/moderations";

export const ratingBaseParser = z.object({
    grade: z.enum(GRADES),
    gradeLevel: z.enum(GRADE_LEVELS),
    courseType: z.enum(COURSE_TYPES),
    overallRating: z.number().min(0).max(4),
    presentsMaterialClearly: z.number().min(0).max(4),
    recognizesStudentDifficulties: z.number().min(0).max(4),
    rating: z.string().trim().min(1),
    tags: z.enum(PROFESSOR_TAGS).array().max(MAX_PROFESSOR_TAGS_PER_RATING).optional(),
    anonymousIdentifier: z.optional(z.string()),
});
export type RatingBase = z.infer<typeof ratingBaseParser>;

export const ratingParser = ratingBaseParser.extend({
    id: z.uuid(),
    professor: z.uuid(),
    postDate: z.string(),
});
export type Rating = z.infer<typeof ratingParser>;
export const publicRatingParser = ratingParser.omit({ anonymousIdentifier: true });
export type PublicRating = z.infer<typeof publicRatingParser>;

export const pendingRatingParser = ratingParser.extend({
    status: z.enum(PENDING_RATING_STATUSES),
    error: z.nullable(z.string()),
    analyzedScores: z
        .custom<Moderation.CategoryScores | Record<string, number>>(
            (mod) => typeof mod === "object",
        )
        .nullable(),
    // Historical logs may still have quarter (3-digit) numbers; new submissions use courseNumParser.
    courseNum: historicalCourseNumParser,
    department: z.enum(DEPARTMENT_LIST),
    // Omitted on older logs. Not part of public ratings.
    scheduleMatch: scheduleMatchParser.optional(),
});
export type PendingRating = z.infer<typeof pendingRatingParser>;

/**
 * `courses` on a professor is a denormalized copy of `Object.keys(reviews)`. It feeds the
 * truncated all-professors list that class search reads, so it must never drift.
 *
 * Read vs write:
 * - Read parsers (`professorParser`, `publicProfessorParser`, `truncatedProfessorParser`) stay
 *   lenient. Records written before the fix may store a bare department (`["BUS"]`), and a
 *   strict read would 500 those professor pages and the all-professors list. Full professor
 *   reads instead re-derive `courses` from `reviews`, so a stale stored value never escapes.
 * - Write parsers (`professorWriteParser`, `truncatedProfessorWriteParser`) are strict. KV
 *   writes go through them, so a record whose `courses` disagrees with its review keys, or
 *   holds something that is not a course key, throws instead of being stored.
 */
export function coursesFromReviews(professor: { reviews: Record<string, unknown> }): string[] {
    return Object.keys(professor.reviews);
}

/** Same set of courses, ignoring order. Duplicates count as a difference. */
export function sameCourses(a: string[], b: string[]): boolean {
    const setA = new Set(a);
    return a.length === b.length && setA.size === new Set(b).size && b.every((c) => setA.has(c));
}

const courseKeyParser = z.string().refine(isCourseKey, {
    error: (issue) => `Expected a course key like "CSC 1001", got ${JSON.stringify(issue.input)}`,
});

export const truncatedProfessorParser = z.object({
    id: z.uuid(),
    department: z.enum(DEPARTMENT_LIST),
    firstName: z.string().trim(),
    lastName: z.string().trim(),
    numEvals: z.number(),
    overallRating: z.number().min(0).max(4),
    materialClear: z.number().min(0).max(4),
    studentDifficulties: z.number().min(0).max(4),
    // Lenient on read: the stored list can still hold legacy bare-department entries.
    courses: z.string().array(),
    tags: z.partialRecord(z.enum(PROFESSOR_TAGS), z.number()).optional(),
    // ISO timestamp of the most recent review; omitted on older index blobs.
    lastRatingDate: z.string().trim().pipe(z.iso.datetime()).optional(),
});
export type TruncatedProfessor = z.infer<typeof truncatedProfessorParser>;

/** A single list entry about to be written. Every course must be a course key. */
export const truncatedProfessorWriteParser = truncatedProfessorParser.extend({
    courses: courseKeyParser.array(),
});

const professorShapeParser = truncatedProfessorParser.extend({
    reviews: z.record(z.string(), ratingParser.array()),
    locked: z.boolean().optional(),
    lockedMessage: z.string().optional(),
});

/** Read parser. Always replaces stored `courses` with the review keys. */
export const professorParser = professorShapeParser.transform((professor) => ({
    ...professor,
    courses: coursesFromReviews(professor),
}));
export type Professor = z.infer<typeof professorParser>;

/** Write parser. Rejects a professor whose `courses` is not exactly its review keys. */
export const professorWriteParser = professorShapeParser.superRefine((professor, ctx) => {
    const reviewKeys = coursesFromReviews(professor);
    for (const key of reviewKeys) {
        if (!isCourseKey(key)) {
            ctx.addIssue({
                code: "custom",
                path: ["reviews", key],
                message: `Review bucket ${JSON.stringify(key)} is not a course key like "CSC 1001".`,
            });
        }
    }
    if (!sameCourses(professor.courses, reviewKeys)) {
        ctx.addIssue({
            code: "custom",
            path: ["courses"],
            message: `courses ${JSON.stringify(professor.courses)} must equal the review keys ${JSON.stringify(reviewKeys)}.`,
        });
    }
});

export const publicProfessorParser = professorShapeParser
    .extend({
        // Intentionally omit sensitive per-rating metadata (e.g. anonymousIdentifier).
        reviews: z.record(z.string(), publicRatingParser.array()),
    })
    .transform((professor) => ({ ...professor, courses: coursesFromReviews(professor) }));
export type PublicProfessor = z.infer<typeof publicProfessorParser>;

export const userParser = z.object({
    username: z.string(),
    password: z.string(),
});
export type User = z.infer<typeof userParser>;

export const reportParser = z.object({
    email: z.nullable(z.string()),
    reason: z.string(),
    anonymousIdentifier: z.optional(z.string()),
});
export const ratingReportParser = z.object({
    ratingId: z.uuid(),
    professorId: z.uuid(),
    reports: reportParser.array(),
    scheduleMatch: scheduleMatchParser.optional(),
});

export type RatingReport = z.infer<typeof ratingReportParser>;
export type Report = z.infer<typeof reportParser>;
