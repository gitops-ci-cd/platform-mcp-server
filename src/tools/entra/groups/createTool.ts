import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";
import {
  getGraphConfig,
  graphApiRequest,
  buildGroupConfig,
  ENTRA_GROUP_TYPES,
  ENTRA_GROUP_VISIBILITY,
  type EntraGroupConfig
} from "../../../clients/entra/index.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  try {
    const {
      displayName,
      description,
      mailNickname,
      groupTypes,
      securityEnabled,
      mailEnabled,
      visibility,
      owners,
      members
    } = args as EntraGroupConfig;

    // Get authenticated user for audit logging
    const user = getCurrentUser(`creating Entra group: ${displayName}`);

    // Load Graph API configuration
    const graphConfig = getGraphConfig();

    // Prepare group configuration using utils
    const groupConfig = buildGroupConfig({
      displayName,
      description,
      mailNickname,
      groupTypes,
      securityEnabled,
      mailEnabled,
      visibility,
      owners,
      members
    });

    // Create the group
    const result = await graphApiRequest(
      "POST",
      "groups",
      graphConfig,
      groupConfig
    );

    const successData = {
      success: true,
      group: {
        id: result.id,
        displayName: result.displayName,
        description: result.description || "",
        mailNickname: result.mailNickname,
        mailEnabled: result.mailEnabled,
        securityEnabled: result.securityEnabled,
        groupTypes: result.groupTypes || [],
        createdDateTime: result.createdDateTime,
        visibility: result.visibility,
        url: `https://portal.azure.com/#view/Microsoft_AAD_IAM/GroupDetailsMenuBlade/~/Overview/groupId/${result.id}`,
        mail: result.mail,
        proxyAddresses: result.proxyAddresses || [],
      },
      tenant_id: graphConfig.tenantId,
      created_by: user.email,
      created_at: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(successData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: successData,
    };

  } catch (error: any) {
    const errorData = {
      error: `Failed to create Entra group: ${error.message}`,
      status: "error",
      details: error.stack || error.toString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(errorData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: errorData,
      isError: true
    };
  }
};

export const createEntraGroupTool: ToolDefinition = {
  name: "createEntraGroup",
  description: "Create a new group in Microsoft Entra ID (Azure AD) via Microsoft Graph API. Supports security groups, Microsoft 365 groups, and distribution lists.",
  inputSchema: z.object({
    displayName: z.string().describe("Group display name (required)"),
    description: z.string().optional().describe("Group description"),
    mailNickname: z.string().optional().describe("Mail nickname (auto-generated from display name if not provided)"),
    groupTypes: z.array(z.enum(ENTRA_GROUP_TYPES)).optional().describe("Group types (Unified for Microsoft 365 groups, DynamicMembership for dynamic groups)"),
    securityEnabled: z.boolean().optional().default(true).describe("Whether this is a security group"),
    mailEnabled: z.boolean().optional().default(false).describe("Whether this group is mail-enabled"),
    visibility: z.enum(ENTRA_GROUP_VISIBILITY).optional().describe("Group visibility"),
    owners: z.array(z.string()).optional().describe("Array of user object IDs to set as group owners"),
    members: z.array(z.string()).optional().describe("Array of user object IDs to add as initial members"),
  }),
  requiredPermissions: ["entra:admin", "entra:groups:create", "admin"],
  callback
};
