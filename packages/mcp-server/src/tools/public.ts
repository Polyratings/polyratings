import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getProfessor, getProfessors, listProfessors } from "../backendClient";
import { publicTool } from "./helpers";
import { pagination, professorIdField } from "./schemas";

export function registerPublicTools(server: McpServer): void {
    server.registerTool(
        "polyratings_list_professors",
        {
            description:
                "Search and list Cal Poly professors. Returns truncated professor records " +
                "(id, name, department, overall rating). " +
                "Use polyratings_get_professor to fetch full details including reviews.",
            inputSchema: {
                search: z
                    .string()
                    .optional()
                    .describe("Case-insensitive name search (matches first or last name)"),
                department: z
                    .string()
                    .optional()
                    .describe("Filter by department code, e.g. 'CSC', 'MATH'"),
                ...pagination(200),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        publicTool("Failed to list professors", ({ search, department, limit, offset }) =>
            listProfessors({ search, department, limit, offset }),
        ),
    );

    server.registerTool(
        "polyratings_get_professor",
        {
            description:
                "Fetch a single professor's full record by ID, including all reviews grouped by course.",
            inputSchema: { id: professorIdField },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        publicTool("Failed to get professor", async ({ id }) => {
            const professor = await getProfessor(id);
            if (!professor) {
                throw new Error(`Professor not found: ${id}`);
            }
            return professor;
        }),
    );

    server.registerTool(
        "polyratings_get_professors",
        {
            description: "Fetch multiple professors by their IDs in a single batch request.",
            inputSchema: {
                ids: z.array(z.uuid()).describe("Array of professor UUIDs"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        publicTool("Failed to get professors", ({ ids }) => getProfessors(ids)),
    );

    server.registerTool(
        "polyratings_get_professor_ratings",
        {
            description:
                "Fetch ratings for a professor, optionally filtered by course name. " +
                "Returns a flat list of ratings with course info attached.",
            inputSchema: {
                professorId: professorIdField,
                course: z
                    .string()
                    .optional()
                    .describe("Exact course name to filter by, e.g. 'CSC 101'"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        publicTool("Failed to get ratings", async ({ professorId, course }) => {
            const professor = await getProfessor(professorId);
            if (!professor) {
                throw new Error(`Professor not found: ${professorId}`);
            }

            const entries = Object.entries(professor.reviews ?? {});
            const filtered = course
                ? entries.filter(([courseName]) => courseName === course)
                : entries;

            return filtered.flatMap(([courseName, ratingsForCourse]) =>
                ratingsForCourse.map((rating) => ({ course: courseName, ...rating })),
            );
        }),
    );
}
