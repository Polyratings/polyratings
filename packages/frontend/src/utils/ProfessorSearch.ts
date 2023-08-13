import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { intersectingDbEntities } from "./intersectingDbEntities";

export type ProfessorSearchType = "name" | "department" | "class";

export function professorSearch(
    allProfessors: inferProcedureOutput<AppRouter["professors"]["all"]>,
    type: ProfessorSearchType,
    value: string,
): inferProcedureOutput<AppRouter["professors"]["all"]> {
    switch (type) {
        case "name": {
            const tokens = value.toLowerCase().split(" ");
            const tokenMatches = tokens.map((token) =>
                allProfessors.filter((professor) =>
                    `${professor.lastName}, ${professor.firstName}`.toLowerCase().includes(token),
                ),
            );
            const { intersect, nonIntersect } = intersectingDbEntities(tokenMatches);
            return [...intersect, ...nonIntersect];
        }
        case "class": {
            const courseName = value.toUpperCase();
            // use includes to possibly be more lenient
            return allProfessors.filter((professor) =>
                professor.courses.find((course) => course.includes(courseName)),
            );
        }
        case "department": {
            const department = value.toUpperCase();
            // Use starts with since most times with department you are looking for an exact match
            return allProfessors.filter((professor) => professor.department.startsWith(department));
        }
        default:
            throw new Error(`Invalid Search Type: ${type}`);
    }
}
