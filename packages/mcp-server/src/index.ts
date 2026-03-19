import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
    BULK_KEYS,
    getBulkKeys,
    getProfessorRatingsByAnonymousIdentifier,
    getBulkValues,
    getPendingProfessors,
    getProfessor,
    getProfessors,
    keepReportedRating,
    listReportedRatings,
    listProfessors,
    removeRatingsBulk,
    removeReportedRating,
} from "./backendClient";

function requireToken(): string {
    const token = process.env.POLYRATINGS_ADMIN_TOKEN ?? null;
    if (!token) {
        throw new Error(
            "No admin token configured. Set POLYRATINGS_ADMIN_TOKEN in the MCP server environment. " +
                "Run packages/mcp-server/scripts/get-token.sh to obtain one.",
        );
    }
    return token;
}

function textResult(data: unknown) {
    return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
}

function errorResult(message: string) {
    return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
    };
}

function formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
}

async function main() {
    const server = new McpServer({
        name: "polyratings-mcp-server",
        version: "0.0.1",
    });

    // --- Public tools ---

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
                limit: z
                    .number()
                    .int()
                    .min(0)
                    .max(200)
                    .optional()
                    .describe("Max non-negative integer results to return (default 50, max 200)"),
                offset: z
                    .number()
                    .int()
                    .min(0)
                    .optional()
                    .describe("Non-negative integer number of results to skip for pagination"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ search, department, limit, offset }) => {
            try {
                return textResult(await listProfessors({ search, department, limit, offset }));
            } catch (err) {
                return errorResult(`Failed to list professors: ${formatError(err)}`);
            }
        },
    );

    server.registerTool(
        "polyratings_get_professor",
        {
            description:
                "Fetch a single professor's full record by ID, including all reviews grouped by course.",
            inputSchema: {
                id: z.uuid().describe("Professor UUID"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ id }) => {
            try {
                const professor = await getProfessor(id);
                if (!professor) {
                    return errorResult(`Professor not found: ${id}`);
                }
                return textResult(professor);
            } catch (err) {
                return errorResult(`Failed to get professor: ${formatError(err)}`);
            }
        },
    );

    server.registerTool(
        "polyratings_get_professors",
        {
            description: "Fetch multiple professors by their IDs in a single batch request.",
            inputSchema: {
                ids: z.array(z.string()).describe("Array of professor UUIDs"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ ids }) => {
            try {
                return textResult(await getProfessors(ids));
            } catch (err) {
                return errorResult(`Failed to get professors: ${formatError(err)}`);
            }
        },
    );

    server.registerTool(
        "polyratings_get_professor_ratings",
        {
            description:
                "Fetch ratings for a professor, optionally filtered by course name. " +
                "Returns a flat list of ratings with course info attached.",
            inputSchema: {
                professorId: z.uuid().describe("Professor UUID"),
                course: z
                    .string()
                    .optional()
                    .describe("Exact course name to filter by, e.g. 'CSC 101'"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ professorId, course }) => {
            try {
                const professor = await getProfessor(professorId);
                if (!professor) {
                    return errorResult(`Professor not found: ${professorId}`);
                }

                const reviews = professor.reviews ?? {};
                const allEntries = Object.entries(reviews);
                const filteredEntries = course
                    ? allEntries.filter(([courseName]) => courseName === course)
                    : allEntries;

                const ratings = filteredEntries.flatMap(([courseName, ratingsForCourse]) =>
                    ratingsForCourse.map((rating) => ({
                        course: courseName,
                        ...rating,
                    })),
                );

                return textResult(ratings);
            } catch (err) {
                return errorResult(`Failed to get ratings: ${formatError(err)}`);
            }
        },
    );

    // --- Admin tools (require POLYRATINGS_ADMIN_TOKEN env var) ---

    server.registerTool(
        "polyratings_admin_get_pending_professors",
        {
            description:
                "List professors pending admin approval. Requires POLYRATINGS_ADMIN_TOKEN.",
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async () => {
            try {
                const token = requireToken();
                return textResult(await getPendingProfessors(token));
            } catch (err) {
                return errorResult(`Failed to get pending professors: ${formatError(err)}`);
            }
        },
    );

    server.registerTool(
        "polyratings_admin_get_bulk_keys",
        {
            description:
                "List all keys stored under a bulk-key group. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                bulkKey: z
                    .enum(BULK_KEYS)
                    .describe(
                        "Bulk-key group: professor-queue, professors, rating-log, or reports",
                    ),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ bulkKey }) => {
            try {
                const token = requireToken();
                return textResult(await getBulkKeys(token, bulkKey));
            } catch (err) {
                return errorResult(`Failed to get bulk keys: ${formatError(err)}`);
            }
        },
    );

    server.registerTool(
        "polyratings_admin_get_bulk_values",
        {
            description:
                "Read the values for specific keys in a bulk-key group. " +
                "Read-only inspection tool. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                bulkKey: z
                    .enum(BULK_KEYS)
                    .describe(
                        "Bulk-key group: professor-queue, professors, rating-log, or reports",
                    ),
                keys: z
                    .array(z.string())
                    .min(1)
                    .max(100)
                    .describe("Keys to fetch values for (1-100)"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ bulkKey, keys }) => {
            try {
                const token = requireToken();
                return textResult(await getBulkValues(token, bulkKey, keys));
            } catch (err) {
                return errorResult(`Failed to get bulk values: ${formatError(err)}`);
            }
        },
    );

    server.registerTool(
        "polyratings_admin_list_reported_ratings",
        {
            description:
                "List currently reported ratings with enriched details (professor, department, rating text, and numeric star fields). " +
                "Equivalent to the Reported Ratings table in the admin UI. " +
                "Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                limit: z
                    .number()
                    .int()
                    .min(0)
                    .max(100)
                    .optional()
                    .describe("Max non-negative integer results to return (default 50, max 100)"),
                offset: z
                    .number()
                    .int()
                    .min(0)
                    .optional()
                    .describe("Non-negative integer number of results to skip for pagination"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ limit, offset }) => {
            try {
                const token = requireToken();
                return textResult(await listReportedRatings(token, { limit, offset }));
            } catch (err) {
                return errorResult(`Failed to list reported ratings: ${formatError(err)}`);
            }
        },
    );

    server.registerTool(
        "polyratings_admin_keep_reported_rating",
        {
            description:
                "Keep a reported rating by removing its report entry only. " +
                "Matches the admin UI 'Keep' action. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                ratingId: z.string().describe("Reported rating UUID"),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ ratingId }) => {
            try {
                const token = requireToken();
                await keepReportedRating(token, ratingId);
                return textResult({
                    success: true,
                    ratingId,
                    action: "kept",
                    message: "Report removed; rating kept.",
                });
            } catch (err) {
                return errorResult(`Failed to keep reported rating: ${formatError(err)}`);
            }
        },
    );

    server.registerTool(
        "polyratings_admin_remove_reported_rating",
        {
            description:
                "Remove a reported rating and clear its report entry. " +
                "Matches the admin UI 'Remove' action. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                ratingId: z.string().describe("Reported rating UUID"),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ ratingId }) => {
            try {
                const token = requireToken();
                await removeReportedRating(token, ratingId);
                return textResult({
                    success: true,
                    ratingId,
                    action: "removed",
                    message: "Rating removed and report cleared.",
                });
            } catch (err) {
                return errorResult(`Failed to remove reported rating: ${formatError(err)}`);
            }
        },
    );

    server.registerTool(
        "polyratings_admin_get_ratings_by_anon_id",
        {
            description:
                "Find all ratings for a professor submitted by a specific anonymous identifier. " +
                "Use this to validate suspected spam clusters by submitter fingerprint. " +
                "Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                professorId: z.uuid().describe("Professor UUID"),
                anonymousIdentifier: z
                    .string()
                    .trim()
                    .min(1)
                    .max(256)
                    .describe("Anonymous submitter identifier"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ professorId, anonymousIdentifier }) => {
            try {
                const token = requireToken();
                return textResult(
                    await getProfessorRatingsByAnonymousIdentifier(
                        token,
                        professorId,
                        anonymousIdentifier,
                    ),
                );
            } catch (err) {
                return errorResult(
                    `Failed to get ratings by anonymous identifier: ${formatError(err)}`,
                );
            }
        },
    );

    server.registerTool(
        "polyratings_admin_remove_ratings_bulk",
        {
            description:
                "Remove multiple ratings for a single professor in one audited action. " +
                "Use for confirmed spam clusters after validation. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                professorId: z.uuid().describe("Professor UUID"),
                ratingIds: z
                    .array(z.uuid())
                    .min(1)
                    .max(50)
                    .describe("Rating UUIDs to remove (1-50)"),
                reason: z.string().min(1).max(600).describe("Audit reason for the bulk deletion"),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ professorId, ratingIds, reason }) => {
            try {
                const token = requireToken();
                await removeRatingsBulk(token, { professorId, ratingIds, reason });
                return textResult({
                    success: true,
                    professorId,
                    requestedCount: ratingIds.length,
                    ratingIds,
                    action: "bulk-removed",
                });
            } catch (err) {
                return errorResult(`Failed to bulk remove ratings: ${formatError(err)}`);
            }
        },
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
});
