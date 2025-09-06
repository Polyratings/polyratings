import { t } from "@backend/trpc";
import { z } from "zod";
import { Professor, ratingBaseParser } from "@backend/types/schema";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { addRating as addRatingToProfessor } from "@backend/types/schemaHelpers";
import { addRating } from "./rating";

export const professorRouter = t.router({
    all: t.procedure.query(({ ctx }) => ctx.env.kvDao.getAllProfessors()),
    get: t.procedure
        .input(z.object({ id: z.uuid() }))
        .query(({ input, ctx }) => ctx.env.kvDao.getProfessor(input.id)),
    getMany: t.procedure
        .input(z.object({ ids: z.array(z.uuid()) }))
        .query(({ input, ctx }) =>
            Promise.all(input.ids.map((id) => ctx.env.kvDao.getProfessor(id))),
        ),
    add: t.procedure
        .input(
            z.object({
                department: z.enum(DEPARTMENT_LIST),
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
            const allProfessors = await ctx.env.kvDao.getAllProfessors();
            const existingProfessor = allProfessors.find(
                ({ firstName, lastName, department }) =>
                    firstName === input.firstName &&
                    lastName === input.lastName &&
                    department === input.department,
            );

            if (existingProfessor) {
                await addRating({ ...input.rating, professor: existingProfessor.id }, ctx);
                return {
                    professorId: existingProfessor.id,
                    message:
                        "Your request for adding a new professor was automatically added to " +
                        `${existingProfessor.lastName}, ${existingProfessor.firstName}. Please reach out to dev@polyratings.dev if this is incorrect`,
                };
            }

            const professorId = crypto.randomUUID();
            const tags = Object.fromEntries((input.rating.tags ?? []).map((tag) => [tag, 1]));
            const professor: Professor = {
                id: professorId,
                firstName: input.firstName,
                lastName: input.lastName,
                department: input.department,
                courses: [input.rating.department],
                numEvals: 1,
                overallRating: input.rating.overallRating,
                materialClear: input.rating.presentsMaterialClearly,
                studentDifficulties: input.rating.recognizesStudentDifficulties,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tags: tags as any,
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
            const duplicatePendingProfessor = existingPendingProfessors.find(
                (prof) =>
                    prof.firstName === professor.firstName && prof.lastName === professor.lastName,
            );

            if (duplicatePendingProfessor) {
                const [[courseName, reviews]] = Object.entries(professor.reviews);
                addRatingToProfessor(duplicatePendingProfessor, reviews[0], courseName);
                await ctx.env.kvDao.putPendingProfessor(duplicatePendingProfessor);
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

            return {
                professorId: null,
                message:
                    "Thank you for adding a professor. It will be reviewed manually and will be available soon",
            };
        }),
});
