import { z } from "zod";
import {
    COURSE_TYPES,
    DEPARTMENT_LIST,
    GRADES,
    GRADE_LEVELS,
    PENDING_RATING_STATUSES,
} from "@polyratings/backend/utils/const";

export const ratingBaseValidator = z.object({
    grade: z.enum(GRADES),
    gradeLevel: z.enum(GRADE_LEVELS),
    courseType: z.enum(COURSE_TYPES),
    postDate: z.string(),
    overallRating: z.number().min(0).max(4),
    presentsMaterialClearly: z.number().min(0).max(4),
    recognizesStudentDifficulties: z.number().min(0).max(4),
    rating: z.string(),
});
export type RatingBase = z.infer<typeof ratingBaseValidator>;

export const ratingValidator = ratingBaseValidator.merge(
    z.object({
        id: z.string().uuid(),
        professor: z.string().uuid(),
    }),
);
export type Rating = z.infer<typeof ratingValidator>;

export const perspectiveAttributeScoreValidator = z.object({
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
export type PerspectiveAttributeScore = z.infer<typeof perspectiveAttributeScoreValidator>;

export const pendingRatingValidator = ratingValidator.merge(
    z.object({
        status: z.enum(PENDING_RATING_STATUSES),
        error: z.nullable(z.string()),
        sentimentResponse: z.nullable(z.record(perspectiveAttributeScoreValidator)),
        courseNum: z.number().min(100).max(599),
        department: z.enum(DEPARTMENT_LIST),
    }),
);
export type PendingRating = z.infer<typeof pendingRatingValidator>;

export const truncatedProfessorValidator = z.object({
    id: z.string().uuid(),
    department: z.enum(DEPARTMENT_LIST),
    firstName: z.string(),
    lastName: z.string(),
    numEvals: z.number(),
    overallRating: z.number().min(0).max(4),
    materialClear: z.number().min(0).max(4),
    studentDifficulties: z.number().min(0).max(4),
    courses: z.array(z.string()),
});
export type TruncatedProfessor = z.infer<typeof truncatedProfessorValidator>;

export const professorValidator = truncatedProfessorValidator.merge(
    z.object({
        reviews: z.record(z.array(ratingValidator)),
    }),
);
export type Professor = z.infer<typeof professorValidator>;

export const userValidator = z.object({
    username: z.string(),
    password: z.string(),
});
export type User = z.infer<typeof userValidator>;

export const reportValidator = z.object({
    email: z.nullable(z.string()),
    reason: z.string(),
});
export const ratingReportValidator = z.object({
    ratingId: z.string().uuid(),
    professorId: z.string().uuid(),
    reports: z.array(reportValidator),
});

export type RatingReport = z.infer<typeof ratingReportValidator>;
export type Report = z.infer<typeof reportValidator>;
