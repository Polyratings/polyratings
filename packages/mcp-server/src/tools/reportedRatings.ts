import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    COURSE_TYPES,
    getAdminClient,
    GRADE_LEVELS,
    GRADES,
    listReportedRatings,
} from "../backendClient";
import { adminTool, runBulk } from "./helpers";
import { pagination, professorIdField, ratingIdField } from "./schemas";

const keepReport = (token: string, id: string) =>
    getAdminClient(token).admin.removeReport.mutate(id);
const removeReport = (token: string, id: string) =>
    getAdminClient(token).admin.actOnReport.mutate(id);

export function registerReportedRatingTools(server: McpServer): void {
    server.registerTool(
        "polyratings_admin_list_reported_ratings",
        {
            description:
                "List currently reported ratings with enriched details (professor, department, " +
                "rating text, ratingBy anonymous identifier, and numeric star fields). " +
                "Equivalent to the Reported Ratings table in the admin UI. " +
                "Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: pagination(100),
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        adminTool("Failed to list reported ratings", ({ limit, offset }, token) =>
            listReportedRatings(token, { limit, offset }),
        ),
    );

    server.registerTool(
        "polyratings_admin_patch_rating",
        {
            description:
                "Correct a live rating's metadata (course, grade, grade level, course type) when " +
                "the author has asked for the change, e.g. a report from the author saying they " +
                "picked the wrong course. Text, star ratings and tags cannot be edited. `reason` " +
                "must say how the author requested it; it is posted to the admin audit channel. " +
                "Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                professorId: professorIdField,
                ratingId: ratingIdField,
                course: z
                    .string()
                    .trim()
                    .min(1)
                    .optional()
                    .describe('New course bucket as "DEPT NUM", e.g. "CSC 1001"'),
                grade: z.enum(GRADES).optional(),
                gradeLevel: z.enum(GRADE_LEVELS).optional(),
                courseType: z.enum(COURSE_TYPES).optional(),
                reason: z
                    .string()
                    .trim()
                    .min(1)
                    .max(600)
                    .describe("How the author asked for this change (e.g. report text and date)"),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool("Failed to patch rating", async (input, token) => {
            const result = await getAdminClient(token).admin.patchRating.mutate(input);
            return { ...result, message: "Rating metadata updated." };
        }),
    );

    server.registerTool(
        "polyratings_admin_keep_reported_rating",
        {
            description:
                "Keep a reported rating by removing its report entry only. " +
                "Matches the admin UI 'Keep' action. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: { ratingId: ratingIdField },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool("Failed to keep reported rating", async ({ ratingId }, token) => {
            await keepReport(token, ratingId);
            return {
                success: true,
                action: "kept",
                ratingId,
                message: "Report removed; rating kept.",
            };
        }),
    );

    server.registerTool(
        "polyratings_admin_remove_reported_rating",
        {
            description:
                "Remove a reported rating and clear its report entry. " +
                "Matches the admin UI 'Remove' action. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: { ratingId: ratingIdField },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool("Failed to remove reported rating", async ({ ratingId }, token) => {
            await removeReport(token, ratingId);
            return {
                success: true,
                action: "removed",
                ratingId,
                message: "Rating removed and report cleared.",
            };
        }),
    );

    server.registerTool(
        "polyratings_admin_bulk_keep_reported_ratings",
        {
            description:
                "Keep multiple reported ratings in one call by clearing each rating's report entry. " +
                "Each id is processed sequentially against polyratings_admin_keep_reported_rating; " +
                "per-id failures do not abort the rest. Matches the admin UI 'Keep' action applied " +
                "to a batch. Returns a summary with per-id success/error and aggregate counts. " +
                "Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                ratingIds: z
                    .array(z.uuid())
                    .min(1)
                    .max(100)
                    .describe("Reported rating UUIDs to keep (1-100)"),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool("Failed to bulk keep reported ratings", ({ ratingIds }, token) =>
            runBulk(ratingIds, {
                idKey: "ratingId",
                action: "bulk-kept",
                successKey: "kept",
                fn: (id) => keepReport(token, id),
            }),
        ),
    );

    server.registerTool(
        "polyratings_admin_bulk_remove_reported_ratings",
        {
            description:
                "Remove multiple reported ratings in one call and clear each rating's report entry. " +
                "Each id is processed sequentially against polyratings_admin_remove_reported_rating; " +
                "per-id failures do not abort the rest. Matches the admin UI 'Remove' action applied " +
                "to a batch. Returns a summary with per-id success/error and aggregate counts. " +
                "Irreversible for each successful row. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                ratingIds: z
                    .array(z.uuid())
                    .min(1)
                    .max(100)
                    .describe("Reported rating UUIDs to remove (1-100)"),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool("Failed to bulk remove reported ratings", ({ ratingIds }, token) =>
            runBulk(ratingIds, {
                idKey: "ratingId",
                action: "bulk-removed",
                successKey: "removed",
                fn: (id) => removeReport(token, id),
            }),
        ),
    );
}
