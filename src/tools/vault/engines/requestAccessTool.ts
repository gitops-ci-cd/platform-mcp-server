import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";

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
  try {
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

    // Get authenticated user for audit logging
    const user = getCurrentUser("requesting Vault access");

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

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "✅ Vault access request created successfully",
            request: accessRequest,
            tracking: {
              request_id: requestId,
              status_url: `https://vault.legalzoom.com/ui/vault/access-requests/${requestId}`,
              estimated_approval_time: "24 hours",
            },
            next_actions: {
              track_request: "Check request status at the provided URL",
              escalate: "Contact security team if urgent",
              prepare: "Ensure you have the necessary Vault CLI/UI access ready",
            },
            policy_preview: {
              suggested_policy: `path "${targetPath}/*" {\n  capabilities = ["${requestType}"]\n}`,
              note: "Actual policy may vary based on security review",
            },
          }, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: `Failed to create Vault access request: ${error.message}`,
            troubleshooting: {
              check_parameters: "Ensure all required parameters are provided",
              check_engine: "Verify the secrets engine path exists",
              check_permissions: "Ensure you have permission to request access",
              contact_support: "Contact security team if issues persist",
            },
            examples: {
              basic_request: "Request read access to 'secret' engine for troubleshooting",
              specific_path: "Request access to 'database/prod-mysql' for application deployment",
              admin_access: "Request admin access to 'pki' engine for certificate management",
            },
          }, null, 2),
          mimeType: "application/json",
        },
      ],
      isError: true,
    };
  }
};

export const requestAccessTool: ToolDefinition = {
  name: "requestVaultAccess",
  description: "Request access to a Vault secrets engine or specific secret path",
  inputSchema,
  callback,
  requiredPermissions: ["vault:request", "security:access-request"],
};
