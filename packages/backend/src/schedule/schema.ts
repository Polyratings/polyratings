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

export const courseSectionsResponseParser = z.object({
    termCode: z.string(),
    courseKey: z.string(),
    sections: sectionOfferingParser.array(),
});

export const instructorMatchResponseParser = z.object({
    termCode: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    sections: sectionOfferingParser.array(),
});

export const instructorSearchResponseParser = z.object({
    query: z.string(),
    termCode: z.string().optional(),
    sections: sectionOfferingParser.array(),
});

export const scheduleSectionsResultParser = z.object({
    available: z.boolean(),
    reason: z.enum(["ok", "not_configured", "not_found", "unavailable"]),
    termCode: z.string().optional(),
    termLabel: z.string().optional(),
    courseKey: z.string().optional(),
    scrapedAt: z.string().nullable().optional(),
    sections: sectionOfferingParser.array(),
});
export type ScheduleSectionsResult = z.infer<typeof scheduleSectionsResultParser>;

const truncatedProfessorForScheduleParser = z.object({
    id: z.uuid(),
    department: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    numEvals: z.number(),
    overallRating: z.number(),
    materialClear: z.number(),
    studentDifficulties: z.number(),
    courses: z.string().array(),
});

export const rankedCourseInstructorParser = z.object({
    professor: truncatedProfessorForScheduleParser,
    sections: sectionOfferingParser.array(),
});

export const unmatchedCourseInstructorParser = z.object({
    instructorRaw: z.string(),
    sections: sectionOfferingParser.array(),
});

export const rankedCourseOfferingsResultParser = scheduleSectionsResultParser.extend({
    topRated: rankedCourseInstructorParser.array(),
    otherRated: rankedCourseInstructorParser.array(),
    unrated: rankedCourseInstructorParser.array(),
    unmatched: unmatchedCourseInstructorParser.array(),
});
export type RankedCourseOfferingsResult = z.infer<typeof rankedCourseOfferingsResultParser>;
