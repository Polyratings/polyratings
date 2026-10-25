import { z } from "zod";

export const sectionStatusParser = z.enum(["OPEN", "CLOSED", "WAITLIST", "UNKNOWN"]);

export const sectionOfferingParser = z.object({
    courseKey: z.string(),
    section: z.string(),
    classNbr: z.string(),
    instructorRaw: z.string(),
    status: sectionStatusParser,
    days: z.string().optional(),
    time: z.string().optional(),
    location: z.string().optional(),
});
export type SectionOffering = z.infer<typeof sectionOfferingParser>;

export const termSummaryParser = z.object({
    termCode: z.string(),
    label: z.string(),
    lastScrapedAt: z.string().nullable(),
    sectionCount: z.number(),
});
export type TermSummary = z.infer<typeof termSummaryParser>;

export const termsListResponseParser = z.object({
    terms: termSummaryParser.array(),
});

export const instructorMatchResponseParser = z.object({
    termCode: z.string(),
    firstName: z.string(),
    lastName: z.string(),
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
    scrapedAtByTerm: z.record(z.string(), z.string().nullable()).optional(),
});
export type ScheduleMatch = z.infer<typeof scheduleMatchParser>;
export type ScheduleMatchStatus = z.infer<typeof scheduleMatchStatusParser>;
