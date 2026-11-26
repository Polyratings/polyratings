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
import { historicalCourseNumParser } from "@backend/utils/courseNum";
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
 * The professor parsers derive it on every parse, read or write, instead of trusting the stored
 * or in-memory value. Records written before the fix may store a bare department (`["BUS"]`);
 * they read with the review keys, and any write stores the review keys. A mismatch is never an
 * error.
 */
export function coursesFromReviews(professor: { reviews: Record<string, unknown> }): string[] {
    return Object.keys(professor.reviews);
}

function withDerivedCourses<T extends { courses: string[]; reviews: Record<string, unknown> }>(
    professor: T,
): T {
    return { ...professor, courses: coursesFromReviews(professor) };
}

export const truncatedProfessorParser = z.object({
    id: z.uuid(),
    department: z.enum(DEPARTMENT_LIST),
    firstName: z.string().trim(),
    lastName: z.string().trim(),
    numEvals: z.number(),
    overallRating: z.number().min(0).max(4),
    materialClear: z.number().min(0).max(4),
    studentDifficulties: z.number().min(0).max(4),
    // The list has no `reviews` to derive from. Legacy entries may hold a bare department until
    // the nightly cron rebuilds the list from professors, which derives `courses`.
    courses: z.string().array(),
    tags: z.partialRecord(z.enum(PROFESSOR_TAGS), z.number()).optional(),
    // ISO timestamp of the most recent review; omitted on older index blobs.
    lastRatingDate: z.string().trim().pipe(z.iso.datetime()).optional(),
});
export type TruncatedProfessor = z.infer<typeof truncatedProfessorParser>;

/**
 * Professor fields without the `courses` derivation. Extend this one when you need to replace a
 * field: Zod refuses to override keys on a schema with a refinement, which `professorParser` has.
 */
export const professorObjectParser = truncatedProfessorParser.extend({
    reviews: z.record(z.string(), ratingParser.array()),
    locked: z.boolean().optional(),
    lockedMessage: z.string().optional(),
});

/** KV read and write parser. Always replaces `courses` with the review keys. */
export const professorParser = professorObjectParser.overwrite(withDerivedCourses);
export type Professor = z.infer<typeof professorParser>;
// Queue-only. Not stored on published professors.
export const pendingProfessorParser = professorParser.extend({
    scheduleMatch: scheduleMatchParser.optional(),
});
export type PendingProfessor = z.infer<typeof pendingProfessorParser>;

export const publicProfessorParser = professorObjectParser
    .extend({
        // Intentionally omit sensitive per-rating metadata (e.g. anonymousIdentifier).
        reviews: z.record(z.string(), publicRatingParser.array()),
    })
    .overwrite(withDerivedCourses);
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
