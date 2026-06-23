import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBulkInspectionTools } from "./bulkInspection";
import { registerLiveProfessorTools } from "./liveProfessors";
import { registerPendingProfessorTools } from "./pendingProfessors";
import { registerPublicTools } from "./public";
import { registerReportedRatingTools } from "./reportedRatings";

export function registerAllTools(server: McpServer): void {
    registerPublicTools(server);
    registerReportedRatingTools(server);
    registerPendingProfessorTools(server);
    registerLiveProfessorTools(server);
    registerBulkInspectionTools(server);
}
