import { t } from "@backend/trpc";
import { z } from "zod";
import { Professor, ratingBaseParser } from "@backend/types/schema";
import { addRating } from "@backend/types/schemaHelpers";
import { DEPARTMENT_LIST } from "@backend/utils/const";

export const professorRouter = t.router({
    all: t.procedure.query(({ ctx }) => ctx.env.kvDao.getAllProfessors()),
    get: t.procedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ input, ctx }) => ctx.env.kvDao.getProfessor(input.id)),
    getMany: t.procedure
        .input(z.object({ ids: z.array(z.string().uuid()) }))
        .query(({ input, ctx }) =>
            Promise.all(input.ids.map((id) => ctx.env.kvDao.getProfessor(id))),
        ),
    add: t.procedure
        .input(
            z.object({
                firstName: z.string(),
                lastName: z.string(),
                rating: ratingBaseParser.merge(
                    z.object({
                        department: z.enum(DEPARTMENT_LIST),
                        courseNum: z.number().min(100).max(599),
                    }),
                ),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const professorId = crypto.randomUUID();
            const tags = Object.fromEntries((input.rating.tags ?? []).map((tag) => [tag, 1]));
            const professor: Professor = {
                id: professorId,
                firstName: input.firstName,
                lastName: input.lastName,
                courses: [input.rating.department],
                numEvals: 1,
                overallRating: input.rating.overallRating,
                materialClear: input.rating.presentsMaterialClearly,
                studentDifficulties: input.rating.recognizesStudentDifficulties,
                tags,
                reviews: {
                    [`${input.rating.department} ${input.rating.courseNum}`]: [
                        {
                            professor: professorId,
                            id: crypto.randomUUID(),
                            postDate: `${new Date()}`,
                            ...input.rating,
                        },
                    ],
                },
            };

            const existingPendingProfessors = await ctx.env.kvDao.getAllPendingProfessors();
            const duplicateProfessor = existingPendingProfessors.find(
                (prof) =>
                    prof.firstName === professor.firstName && prof.lastName === professor.lastName,
            );

            if (duplicateProfessor) {
                const [[courseName, reviews]] = Object.entries(professor.reviews);
                addRating(duplicateProfessor, reviews[0], courseName);
                await ctx.env.kvDao.putPendingProfessor(duplicateProfessor);
            } else {
                await ctx.env.kvDao.putPendingProfessor(professor);

                const allPending = await ctx.env.kvDao.getAllPendingProfessors();
                await ctx.env.notificationDAO.notify(
                    "Pending Professor Notification",
                    `Professor ${professor.firstName} ${professor.lastName} ` +
                        `with id: ${professor.id} is waiting for approval!\n` +
                        `There is currently ${allPending.length} in the approval queue`,
                );
            }

            return "The request for the new professor has been accepted and is pending manual approval";
        }),
});
