import { z } from "zod";
import { DEPARTMENT_LIST } from "../backendClient";

export const pagination = (maxLimit: number, defaultLimit = 50) => ({
    limit: z
        .number()
        .int()
        .min(0)
        .max(maxLimit)
        .optional()
        .describe(
            `Max non-negative integer results to return (default ${defaultLimit}, max ${maxLimit})`,
        ),
    offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Non-negative integer number of results to skip for pagination"),
});

export const professorIdField = z.uuid().describe("Professor UUID");
export const pendingProfessorIdField = z.uuid().describe("Pending professor UUID");
export const liveProfessorIdField = z.uuid().describe("Live professor UUID");
export const ratingIdField = z.uuid().describe("Reported rating UUID");

export const departmentField = z
    .enum(DEPARTMENT_LIST)
    .describe("Canonical Polyratings department code, e.g. 'CSC', 'MATH'");

export const nameFields = {
    firstName: z.string().trim().min(1).describe("Corrected first name"),
    lastName: z.string().trim().min(1).describe("Corrected last name"),
};
