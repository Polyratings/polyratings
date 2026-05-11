import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAdminClient, type Department } from "../backendClient";
import { adminTool } from "./helpers";
import { departmentField, liveProfessorIdField, nameFields, professorIdField } from "./schemas";

export function registerLiveProfessorTools(server: McpServer): void {
    server.registerTool(
        "polyratings_admin_change_professor_name",
        {
            description:
                "Change the first and/or last name on a LIVE (already-approved) professor row. " +
                "Use to fix casing, typos, or to ASCII-fold non-ASCII characters so the fuzzy " +
                "search index can find the record. Operates on the live professor store, not " +
                "the pending queue. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                professorId: liveProfessorIdField,
                ...nameFields,
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool(
            "Failed to change professor name",
            async ({ professorId, firstName, lastName }, token) => {
                await getAdminClient(token).admin.changeProfessorName.mutate({
                    professorId,
                    firstName,
                    lastName,
                });
                return {
                    success: true,
                    action: "professor-name-updated",
                    professorId,
                    firstName,
                    lastName,
                };
            },
        ),
    );

    server.registerTool(
        "polyratings_admin_change_professor_dept",
        {
            description:
                "Change the department on a LIVE (already-approved) professor row. Use to " +
                "correct a miscategorized professor; department must be one of the canonical " +
                "Polyratings department codes. Operates on the live professor store, not the " +
                "pending queue. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                professorId: liveProfessorIdField,
                department: departmentField,
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool(
            "Failed to change professor department",
            async ({ professorId, department }, token) => {
                await getAdminClient(token).admin.changeProfessorDepartment.mutate({
                    professorId,
                    department: department as Department,
                });
                return {
                    success: true,
                    action: "professor-department-updated",
                    professorId,
                    department,
                };
            },
        ),
    );

    server.registerTool(
        "polyratings_admin_merge_professors",
        {
            description:
                "Merge duplicate professor profiles: copy all ratings from source into destination, " +
                "recompute destination aggregates, then delete the source professor. " +
                "The destination (destId) is kept; use polyratings_list_professors / polyratings_get_professor " +
                "to confirm IDs first. Irreversible. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                destId: professorIdField.describe(
                    "Professor UUID to keep (canonical profile after merge)",
                ),
                sourceId: professorIdField.describe(
                    "Professor UUID to merge in and remove (duplicate)",
                ),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool(
            "Failed to merge professors",
            async ({ destId, sourceId }, token) => {
                await getAdminClient(token).admin.mergeProfessor.mutate({ destId, sourceId });
                return {
                    success: true,
                    action: "merged",
                    destId,
                    sourceId,
                    message:
                        "All ratings from source were added to destination; source professor was removed.",
                };
            },
            ({ destId, sourceId }) =>
                destId === sourceId
                    ? "destId and sourceId must be different professor UUIDs."
                    : null,
        ),
    );
}
