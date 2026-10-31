import { z } from "zod";

/** Instructor section reduced to the course key Polyratings matches against. */
export const sectionOfferingParser = z.object({
    courseKey: z.string(),
});
export type SectionOffering = z.infer<typeof sectionOfferingParser>;

/** Covered term. Empty terms (`sectionCount` 0) are ignored. */
export const termSummaryParser = z.object({
    termCode: z.string(),
    sectionCount: z.number(),
});
export type TermSummary = z.infer<typeof termSummaryParser>;

export const termsListResponseParser = z.object({
    terms: termSummaryParser.array(),
});

export const instructorMatchResponseParser = z.object({
    sections: sectionOfferingParser.array(),
});

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
