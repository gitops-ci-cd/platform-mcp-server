import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerToolsWithServer } from "../tools/index.js";
import { registerResourcesWithServer, registerResourceTemplatesWithServer } from "../resources/index.js";
import { registerPromptsWithServer } from "../prompts/index.js";
import { getCurrentUser } from "../../lib/auth/index.js";
import pkg from "../../package.json" with { type: "json" };

const { name, version, description, displayName } = pkg;

export const initializeMcpServer = (auth: boolean = true): McpServer => {
  const server = new McpServer({
    name,
    version,
    title: displayName,
    description,
  });

  let user;
  if (auth) {
    user = getCurrentUser("accessing MCP server");
  }
  const userPermissions = user?.permissions || [];

  // Register all authorized capabilities
  registerToolsWithServer(server, userPermissions);
  registerResourcesWithServer(server, userPermissions);
  registerResourceTemplatesWithServer(server, userPermissions);
  registerPromptsWithServer(server, userPermissions);

  return server;
};
