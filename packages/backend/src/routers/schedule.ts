import { t, publicProcedure } from "@backend/trpc";
import {
    rankedCourseOfferingsResultParser,
    scheduleSectionsResultParser,
} from "@backend/schedule/schema";
import { rankCourseInstructors } from "@backend/schedule/rankCourseInstructors";
import { courseNumParser } from "@backend/utils/courseNum";
import { z } from "zod";

const emptyRankedOfferings = {
    topRated: [],
    otherRated: [],
    unrated: [],
    unmatched: [],
};

export const scheduleRouter = t.router({
    getSectionsForCourse: publicProcedure
        .input(
            z.object({
                department: z.string().min(1),
                courseNum: courseNumParser,
                termCode: z.string().optional(),
            }),
        )
        .output(scheduleSectionsResultParser)
        .query(({ ctx, input }) => ctx.env.scheduleClient.getSectionsForCourse(input)),
    getRankedCourseOfferings: publicProcedure
        .input(
            z.object({
                department: z.string().min(1),
                courseNum: courseNumParser,
                termCode: z.string().optional(),
            }),
        )
        .output(rankedCourseOfferingsResultParser)
        .query(async ({ ctx, input }) => {
            const schedule = await ctx.env.scheduleClient.getSectionsForCourse(input);
            if (!schedule.available) {
                return { ...schedule, ...emptyRankedOfferings };
            }

            const professors = await ctx.env.kvDao.getAllProfessors();
            const rankings = rankCourseInstructors(schedule.sections, professors);

            return {
                ...schedule,
                ...rankings,
            };
        }),
    getSectionsForProfessor: publicProcedure
        .input(
            z.object({
                firstName: z.string().min(1),
                lastName: z.string().min(1),
                termCode: z.string().optional(),
            }),
        )
        .output(scheduleSectionsResultParser)
        .query(({ ctx, input }) => ctx.env.scheduleClient.getSectionsForProfessor(input)),
    listTerms: publicProcedure
        .output(
            z.object({
                available: z.boolean(),
                terms: z
                    .object({
                        termCode: z.string(),
                        label: z.string(),
                        lastScrapedAt: z.string().nullable(),
                        sectionCount: z.number(),
                    })
                    .array(),
            }),
        )
        .query(async ({ ctx }) => {
            if (!ctx.env.scheduleClient.isConfigured) {
                return { available: false, terms: [] };
            }

            const terms = await ctx.env.scheduleClient.listTerms();
            if (!terms) {
                return { available: false, terms: [] };
            }

            return { available: true, terms };
        }),
});
