import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BULK_KEYS, getAdminClient } from "../backendClient";
import { adminTool } from "./helpers";
import { professorIdField } from "./schemas";

const bulkKeyField = z
    .enum(BULK_KEYS)
    .describe("Bulk-key group: professor-queue, professors, rating-log, or reports");

export function registerBulkInspectionTools(server: McpServer): void {
    server.registerTool(
        "polyratings_admin_get_bulk_keys",
        {
            description:
                "List all keys stored under a bulk-key group. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: { bulkKey: bulkKeyField },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        adminTool("Failed to get bulk keys", ({ bulkKey }, token) =>
            getAdminClient(token).admin.getBulkKeys.query(bulkKey),
        ),
    );

    server.registerTool(
        "polyratings_admin_get_bulk_values",
        {
            description:
                "Read the values for specific keys in a bulk-key group. " +
                "Read-only inspection tool. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                bulkKey: bulkKeyField,
                keys: z
                    .array(z.string())
                    .min(1)
                    .max(100)
                    .describe("Keys to fetch values for (1-100)"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        adminTool("Failed to get bulk values", ({ bulkKey, keys }, token) =>
            getAdminClient(token).admin.getBulkValues.mutate({ bulkKey, keys }),
        ),
    );

    server.registerTool(
        "polyratings_admin_get_ratings_by_anon_id",
        {
            description:
                "Find all ratings for a professor submitted by a specific anonymous identifier. " +
                "Use this to validate suspected spam clusters by submitter fingerprint. " +
                "Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                professorId: professorIdField,
                anonymousIdentifier: z
                    .string()
                    .trim()
                    .min(1)
                    .max(256)
                    .describe("Anonymous submitter identifier"),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        adminTool(
            "Failed to get ratings by anonymous identifier",
            ({ professorId, anonymousIdentifier }, token) =>
                getAdminClient(token).admin.getRatingsByAnonymousIdentifier.query({
                    professorId,
                    anonymousIdentifier,
                }),
        ),
    );

    server.registerTool(
        "polyratings_admin_remove_ratings_bulk",
        {
            description:
                "Remove multiple ratings for a single professor in one audited action. " +
                "Use for confirmed spam clusters after validation. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                professorId: professorIdField,
                ratingIds: z
                    .array(z.uuid())
                    .min(1)
                    .max(50)
                    .describe("Rating UUIDs to remove (1-50)"),
                reason: z
                    .string()
                    .trim()
                    .min(1)
                    .max(600)
                    .describe("Audit reason for the bulk deletion"),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool(
            "Failed to bulk remove ratings",
            async ({ professorId, ratingIds, reason }, token) => {
                const { removed } = await getAdminClient(token).admin.removeRatingsBulk.mutate({
                    professorId,
                    ratingIds,
                    reason,
                });
                return {
                    success: true,
                    action: "bulk-removed",
                    professorId,
                    removedCount: removed,
                    requestedRatingIdsCount: ratingIds.length,
                    ratingIds,
                };
            },
        ),
    );
}
