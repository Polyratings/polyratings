import { z } from "zod";

/** Body of `GET /v1/instructors/course-match`. The Schedule API decides coverage and matching. */
export const courseMatchResponseParser = z.object({
    status: z.enum(["confirmed", "course_not_taught", "not_applicable"]),
    termCodesChecked: z.string().array(),
    matchedCourseKeys: z.string().array(),
});
export type CourseMatchResponse = z.infer<typeof courseMatchResponseParser>;

export const scheduleMatchStatusParser = z.enum([
    "confirmed",
    "course_not_taught",
    "not_applicable",
    "unavailable",
]);

/** Server-only metadata. Never copy onto public rating payloads. */
export const scheduleMatchParser = z.object({
    status: scheduleMatchStatusParser,
    termCodesChecked: z.string().array(),
    matchedCourseKeys: z.string().array(),
    submittedCourseKey: z.string(),
});
export type ScheduleMatch = z.infer<typeof scheduleMatchParser>;
export type ScheduleMatchStatus = z.infer<typeof scheduleMatchStatusParser>;
