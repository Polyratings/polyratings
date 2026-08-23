import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools";

async function main() {
    const server = new McpServer({
        name: "polyratings-mcp-server",
        version: "0.0.1",
    });

    registerAllTools(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
});
