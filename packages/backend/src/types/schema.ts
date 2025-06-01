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

export const ratingBaseParser = z.object({
    grade: z.enum(GRADES),
    gradeLevel: z.enum(GRADE_LEVELS),
    courseType: z.enum(COURSE_TYPES),
    overallRating: z.number().min(0).max(4),
    presentsMaterialClearly: z.number().min(0).max(4),
    recognizesStudentDifficulties: z.number().min(0).max(4),
    rating: z.string(),
    tags: z.enum(PROFESSOR_TAGS).array().max(MAX_PROFESSOR_TAGS_PER_RATING).optional(),
    anonymousIdentifier: z.optional(z.string()),
});
export type RatingBase = z.infer<typeof ratingBaseParser>;

export const ratingParser = ratingBaseParser.merge(
    z.object({
        id: z.string().uuid(),
        professor: z.string().uuid(),
        postDate: z.string(),
    }),
);
export type Rating = z.infer<typeof ratingParser>;

export const perspectiveAttributeScoreParser = z.object({
    summaryScore: z.object({
        value: z.number(),
        type: z.string(),
    }),
    spanScores: z.nullable(
        z.array(
            z.object({
                begin: z.number(),
                end: z.number(),
                score: z.object({
                    value: z.number(),
                    type: z.string(),
                }),
            }),
        ),
    ),
});
export type PerspectiveAttributeScore = z.infer<typeof perspectiveAttributeScoreParser>;

export const pendingRatingParser = ratingParser.merge(
    z.object({
        status: z.enum(PENDING_RATING_STATUSES),
        error: z.nullable(z.string()),
        analyzedScores: z.nullable(z.record(z.number())),
        courseNum: z.number().min(100).max(599),
        department: z.enum(DEPARTMENT_LIST),
    }),
);
export type PendingRating = z.infer<typeof pendingRatingParser>;

export const truncatedProfessorParser = z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    numEvals: z.number(),
    overallRating: z.number().min(0).max(4),
    materialClear: z.number().min(0).max(4),
    studentDifficulties: z.number().min(0).max(4),
    courses: z.array(z.string()),
    tags: z.record(z.enum(PROFESSOR_TAGS), z.number()).optional(),
});
export type TruncatedProfessor = z.infer<typeof truncatedProfessorParser>;

export const professorParser = truncatedProfessorParser.merge(
    z.object({
        reviews: z.record(z.array(ratingParser)),
    }),
);
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
    ratingId: z.string().uuid(),
    professorId: z.string().uuid(),
    reports: z.array(reportParser),
});

export type RatingReport = z.infer<typeof ratingReportParser>;
export type Report = z.infer<typeof reportParser>;
