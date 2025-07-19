import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { initializeMcpServer } from "../services/mcpService.js";

const transport = new StdioServerTransport();

const server = initializeMcpServer(false);

console.log("Connecting MCP server to STDIO transport...");
await server.connect(transport);
