import { t } from "@backend/trpc";
import { z } from "zod";
import { Professor, Rating, ratingBaseValidator } from "@backend/types/schema";
import { addRating } from "@backend/types/schemaHelpers";
import { DEPARTMENT_LIST } from "@backend/utils/const";

export const professorRouter = t.router({
    allProfessors: t.procedure.query(({ ctx }) => ctx.env.kvDao.getAllProfessors()),
    getProfessor: t.procedure
        .input(z.string().uuid())
        .query(({ input, ctx }) => ctx.env.kvDao.getProfessor(input)),
    getProfessors: t.procedure
        .input(z.array(z.string().uuid()))
        .query(({ input, ctx }) => Promise.all(input.map((id) => ctx.env.kvDao.getProfessor(id)))),
    addNewProfessor: t.procedure
        .input(
            z.object({
                department: z.enum(DEPARTMENT_LIST),
                firstName: z.string(),
                lastName: z.string(),
                rating: ratingBaseValidator.merge(
                    z.object({
                        department: z.enum(DEPARTMENT_LIST),
                        courseNum: z.number().min(100).max(599),
                    }),
                ),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const professor: Professor = {
                id: crypto.randomUUID(),
                firstName: input.firstName,
                lastName: input.lastName,
                department: input.department,
                courses: [input.rating.department],
                numEvals: 1,
                overallRating: input.rating.overallRating,
                materialClear: input.rating.presentsMaterialClearly,
                studentDifficulties: input.rating.recognizesStudentDifficulties,
                reviews: {
                    [`${input.rating.department} ${input.rating.courseNum}`]: [
                        {
                            id: crypto.randomUUID(),
                            overallRating: input.rating.overallRating,
                            presentsMaterialClearly: input.rating.presentsMaterialClearly,
                            recognizesStudentDifficulties:
                                input.rating.recognizesStudentDifficulties,
                            grade: input.rating.grade,
                            gradeLevel: input.rating.gradeLevel,
                            courseType: input.rating.courseType,
                            rating: input.rating.rating,
                        },
                    ],
                } as Record<string, Rating[]>,
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
                await ctx.env.notificationDAO.sendWebhook(
                    "Pending Professor Notification",
                    `Professor ${professor.firstName} ${professor.lastName} ` +
                        `with id: ${professor.id} is waiting for approval!`,
                );
            }

            return "The request for the new professor has been accepted and is pending manual approval";
        }),
});
