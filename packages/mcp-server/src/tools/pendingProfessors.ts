import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient, submitPendingUnderExisting, type Department } from "../backendClient";
import { adminTool, runBulk } from "./helpers";
import { departmentField, nameFields, pendingProfessorIdField, professorIdField } from "./schemas";

const approvePending = (token: string, id: string) =>
    getAdminClient(token).admin.approvePendingProfessor.mutate(id);
const rejectPending = (token: string, id: string) =>
    getAdminClient(token).admin.rejectPendingProfessor.mutate(id);

export function registerPendingProfessorTools(server: McpServer): void {
    server.registerTool(
        "polyratings_admin_get_pending_professors",
        {
            description:
                "List professors pending admin approval. Requires POLYRATINGS_ADMIN_TOKEN.",
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        adminTool("Failed to get pending professors", (_args, token) =>
            getAdminClient(token).admin.getPendingProfessors.query(),
        ),
    );

    server.registerTool(
        "polyratings_admin_approve_pending_professor",
        {
            description:
                "Approve a pending professor submission. Promotes the entire pending record " +
                "(including all attached reviews) to a live professor profile. " +
                "Per the moderation playbook, every attached review must pass the publication bar " +
                "before approving — use polyratings_admin_get_pending_professors to inspect first. " +
                "Irreversible (deletes the pending row). Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: { pendingProfessorId: pendingProfessorIdField },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool("Failed to approve pending professor", async ({ pendingProfessorId }, token) => {
            await approvePending(token, pendingProfessorId);
            return {
                success: true,
                action: "approved",
                pendingProfessorId,
                message: "Pending professor promoted to live profile and pending row removed.",
            };
        }),
    );

    server.registerTool(
        "polyratings_admin_reject_pending_professor",
        {
            description:
                "Reject a pending professor submission. Deletes the pending row (including all " +
                "attached reviews) without promoting to live. Use when any attached review fails " +
                "the publication bar, when the submission is spam/hoax, or when the person cannot " +
                "be verified. Irreversible. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: { pendingProfessorId: pendingProfessorIdField },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool("Failed to reject pending professor", async ({ pendingProfessorId }, token) => {
            await rejectPending(token, pendingProfessorId);
            return {
                success: true,
                action: "rejected",
                pendingProfessorId,
                message: "Pending professor removed.",
            };
        }),
    );

    server.registerTool(
        "polyratings_admin_bulk_approve_pending",
        {
            description:
                "Approve multiple pending professor submissions in one call. Each id is processed " +
                "sequentially against polyratings_admin_approve_pending_professor; per-id failures " +
                "do not abort the rest. Returns a summary with per-id success/error and aggregate " +
                "counts. Every attached review on each pending row must pass the publication bar " +
                "before including it here — inspect with polyratings_admin_get_pending_professors " +
                "first. Irreversible for each successful row. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                pendingProfessorIds: z
                    .array(z.uuid())
                    .min(1)
                    .max(100)
                    .describe("Pending professor UUIDs to approve (1-100)"),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool("Failed to bulk approve pending professors", ({ pendingProfessorIds }, token) =>
            runBulk(pendingProfessorIds, {
                idKey: "pendingProfessorId",
                action: "bulk-approved",
                successKey: "approved",
                fn: (id) => approvePending(token, id),
            }),
        ),
    );

    server.registerTool(
        "polyratings_admin_bulk_reject_pending",
        {
            description:
                "Reject multiple pending professor submissions in one call. Each id is processed " +
                "sequentially against polyratings_admin_reject_pending_professor; per-id failures " +
                "do not abort the rest. Returns a summary with per-id success/error and aggregate " +
                "counts. Use for batch-clearing rows that fail identity verification or the review " +
                "publication bar. Irreversible for each successful row. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                pendingProfessorIds: z
                    .array(z.uuid())
                    .min(1)
                    .max(100)
                    .describe("Pending professor UUIDs to reject (1-100)"),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool("Failed to bulk reject pending professors", ({ pendingProfessorIds }, token) =>
            runBulk(pendingProfessorIds, {
                idKey: "pendingProfessorId",
                action: "bulk-rejected",
                successKey: "rejected",
                fn: (id) => rejectPending(token, id),
            }),
        ),
    );

    server.registerTool(
        "polyratings_admin_change_pending_professor_name",
        {
            description:
                "Change the first and/or last name on a pending professor row before approval. " +
                "Use to fix casing (e.g. 'carlos gomez' -> 'Carlos Gomez'), accents " +
                "(e.g. 'Leon' -> 'León'), or a submitter typo before approving. " +
                "Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                professorId: pendingProfessorIdField,
                ...nameFields,
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool(
            "Failed to change pending professor name",
            async ({ professorId, firstName, lastName }, token) => {
                await getAdminClient(token).admin.changePendingProfessorName.mutate({
                    professorId,
                    firstName,
                    lastName,
                });
                return {
                    success: true,
                    action: "pending-name-updated",
                    professorId,
                    firstName,
                    lastName,
                };
            },
        ),
    );

    server.registerTool(
        "polyratings_admin_change_pending_professor_dept",
        {
            description:
                "Change the department on a pending professor row before approval. Use when the " +
                "submitter picked the wrong department code; re-run duplicate and identity checks " +
                "against the new department before approving. Department must be one of the " +
                "canonical Polyratings department codes (same list the submission form uses). " +
                "Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                professorId: pendingProfessorIdField,
                department: departmentField,
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool(
            "Failed to change pending professor department",
            async ({ professorId, department }, token) => {
                await getAdminClient(token).admin.changePendingProfessorDepartment.mutate({
                    professorId,
                    department: department as Department,
                });
                return {
                    success: true,
                    action: "pending-department-updated",
                    professorId,
                    department,
                };
            },
        ),
    );

    server.registerTool(
        "polyratings_admin_submit_pending_under_existing",
        {
            description:
                "Re-submit every review attached to a pending professor under an existing live " +
                "professor, then reject (remove) the pending row. Mirrors the admin UI's 'Submit " +
                "under [existing prof]' action and is the preferred one-call alternative to " +
                "approve + merge when a submitter created a new pending row for someone who is " +
                "already in the live database (wrong name, different department, casing, etc.). " +
                "Differences vs. approve + merge: (1) this path re-runs AI moderation and rate " +
                "limiting on each review via the public ratings.add endpoint, (2) original " +
                "anonymousIdentifier is replaced with a fresh one on resubmission, (3) on partial " +
                "failure the pending row is left in place so nothing is lost. Irreversible on " +
                "success. Requires POLYRATINGS_ADMIN_TOKEN.",
            inputSchema: {
                pendingProfessorId: pendingProfessorIdField.describe(
                    "Pending professor UUID to consume",
                ),
                destProfessorId: professorIdField.describe(
                    "Live professor UUID to receive the reviews (canonical profile)",
                ),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        adminTool(
            "Failed to submit pending professor under existing",
            async ({ pendingProfessorId, destProfessorId }, token) => {
                const result = await submitPendingUnderExisting(token, {
                    pendingProfessorId,
                    destProfessorId,
                });
                return { success: true, action: "submitted-under-existing", ...result };
            },
            ({ pendingProfessorId, destProfessorId }) =>
                pendingProfessorId === destProfessorId
                    ? "pendingProfessorId and destProfessorId must be different UUIDs."
                    : null,
        ),
    );
}
