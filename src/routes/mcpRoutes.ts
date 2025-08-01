import { Router } from "express";
import {
  mcpAuthMetadataRouter,
  createOAuthMetadata,
  getOAuthProtectedResourceMetadataUrl,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";

import { createEntraProxyProvider, userContextMiddleware } from "../../lib/auth/index.js";
import { httpHandler, sessionHandler } from "../handlers/mcpHTTPHandler.js";
import { getEntraConfig } from "../../lib/clients/entra/config.js";

const router: Router = Router();

// MCP OAuth metadata routes - this MCP server is a resource server, Entra ID is the auth server
const config = getEntraConfig();
const provider = createEntraProxyProvider();
const resourceServerUrl = new URL("http://localhost:8080");

router.use(
  mcpAuthMetadataRouter({
    oauthMetadata: createOAuthMetadata({
      provider,
      issuerUrl: new URL(`https://login.microsoftonline.com/${config.tenantId}/v2.0`),
      serviceDocumentationUrl: new URL(
        "https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow"
      ),
    }),
    resourceServerUrl,
    serviceDocumentationUrl: new URL("https://github.com/legalzoom/platform-mcp-server"),
  })
);

const authMiddleware = requireBearerAuth({
  verifier: provider,
  resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resourceServerUrl),
});

// Protected endpoints - require Bearer token
router.post("/execute", authMiddleware, userContextMiddleware, httpHandler);
router.get("/execute", authMiddleware, userContextMiddleware, sessionHandler);
router.delete("/execute", authMiddleware, userContextMiddleware, sessionHandler);

export default router;
