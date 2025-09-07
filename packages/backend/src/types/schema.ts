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

export const pendingRatingParser = ratingParser.extend({
    status: z.enum(PENDING_RATING_STATUSES),
    error: z.nullable(z.string()),
    analyzedScores: z.custom<Moderation>((mod) => typeof mod === "object").nullable(),
    courseNum: z.number().min(100).max(599),
    department: z.enum(DEPARTMENT_LIST),
});
export type PendingRating = z.infer<typeof pendingRatingParser>;

export const truncatedProfessorParser = z.object({
    id: z.uuid(),
    department: z.enum(DEPARTMENT_LIST),
    firstName: z.string().trim(),
    lastName: z.string().trim(),
    numEvals: z.number(),
    overallRating: z.number().min(0).max(4),
    materialClear: z.number().min(0).max(4),
    studentDifficulties: z.number().min(0).max(4),
    courses: z.string().array(),
    tags: z.partialRecord(z.enum(PROFESSOR_TAGS), z.number()).optional(),
});
export type TruncatedProfessor = z.infer<typeof truncatedProfessorParser>;

export const professorParser = truncatedProfessorParser.extend({
    reviews: z.record(z.string(), ratingParser.array()),
});
export type Professor = z.infer<typeof professorParser>;

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
});

export type RatingReport = z.infer<typeof ratingReportParser>;
export type Report = z.infer<typeof reportParser>;
