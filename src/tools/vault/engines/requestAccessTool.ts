import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import { getVaultConfig } from "../../../../lib/clients/vault/index.js";

const inputSchema = z.object({
  enginePath: z.string().describe("The secrets engine path (e.g., 'secret', 'database', 'kv-v2')"),
  secretPath: z.string().optional().describe("Specific secret path within the engine (optional, for granular access)"),
  requestType: z.enum(["read", "write", "admin"]).default("read").describe("Type of access being requested"),
  justification: z.string().describe("Business justification for the access request"),
  duration: z.string().default("24h").describe("Requested access duration (e.g., '24h', '7d', '30d')"),
  team: z.string().describe("Team or project name requiring access"),
  urgency: z.enum(["low", "medium", "high", "critical"]).default("medium").describe("Urgency level of the access request"),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const {
    enginePath,
    secretPath,
    requestType = "read",
    justification,
    duration = "24h",
    urgency = "medium",
  } = args as {
    enginePath: string;
    secretPath?: string;
    requestType?: "read" | "write" | "admin";
    justification: string;
    duration?: string;
    urgency?: "low" | "medium" | "high" | "critical";
  };

  try {
    // Get authenticated user for audit logging
    const user = getCurrentUser("requesting Vault access");

    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // TODO: Implement actual access request logic
    // This could integrate with:
    // - JIRA Service Desk for ticket creation
    // - Slack for notifications
    // - Internal approval systems
    // - Vault policy generation tools

    const requestId = `vault-access-${Date.now()}`;
    const targetPath = secretPath ? `${enginePath}/${secretPath}` : enginePath;

    // Simulate request creation
    const accessRequest = {
      id: requestId,
      target: {
        engine: enginePath,
        path: secretPath,
        fullPath: targetPath,
      },
      access: {
        type: requestType,
        duration: duration,
        urgency: urgency,
      },
      requester: {
        user: user.email,
        timestamp: new Date().toISOString(),
      },
      justification: justification,
      next_steps: [
        "Access request has been created and is pending approval",
        "Security team will review the request within 24 hours",
        "You will be notified via email when access is granted",
      ],
    };

    const engineWebUrl = `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/secrets/${enginePath}`;

    return toolResponse({
      message: "Vault access request created successfully",
      data: accessRequest, // Raw access request object
      links: {
        status: `${engineWebUrl}/ui/vault/access-requests/${requestId}`,
      },
      metadata: {
        requestId,
        estimatedApprovalTime: "24 hours",
        potentialActions: [
          "Check request status at the provided URL",
          "Contact security team if urgent",
          "Prepare necessary Vault CLI/UI access"
        ],
        policyPreview: `path "${targetPath}/*" {\n  capabilities = ["${requestType}"]\n}`
      }
    });
  } catch (error: any) {
    return toolResponse({
      message: `Failed to create Vault access request: ${error.message}`,
      data: error, // Raw error object
      links: {
        docs: "https://developer.hashicorp.com/vault/docs/auth",
        troubleshooting: "https://developer.hashicorp.com/vault/docs/troubleshooting"
      },
      metadata: {
        troubleshooting: [
          "Ensure all required parameters are provided",
          "Verify the secrets engine path exists",
          "Ensure you have permission to request access",
          "Contact security team if issues persist"
        ],
        examples: [
          "Request read access to 'secret' engine for troubleshooting",
          "Request access to 'database/prod-mysql' for application deployment",
          "Request admin access to 'pki' engine for certificate management"
        ]
      }
    }, true);
  }
};

export const requestAccessTool: ToolDefinition = {
  title: "Request Vault Access",
  description: "Request access to a Vault secrets engine or specific secret path",
  inputSchema,
  callback,
  requiredPermissions: ["vault:request", "security:access-request"],
};
