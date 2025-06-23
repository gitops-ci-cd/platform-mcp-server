import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";
import {
  getGraphConfig,
  graphApiRequest,
  buildGroupConfig,
  ENTRA_GROUP_TYPES,
  ENTRA_GROUP_VISIBILITY,
  type EntraGroupConfig
} from "../../../clients/entra/index.js";

const inputSchema = z.object({
  displayName: z.string().describe("Group display name (required)"),
  description: z.string().optional().describe("Group description"),
  mailNickname: z.string().optional().describe("Mail nickname (auto-generated from display name if not provided)"),
  groupTypes: z.array(z.enum(ENTRA_GROUP_TYPES)).optional().describe("Group types (Unified for Microsoft 365 groups, DynamicMembership for dynamic groups)"),
  securityEnabled: z.boolean().optional().default(true).describe("Whether this is a security group"),
  mailEnabled: z.boolean().optional().default(false).describe("Whether this group is mail-enabled"),
  visibility: z.enum(ENTRA_GROUP_VISIBILITY).optional().describe("Group visibility"),
  owners: z.array(z.string()).optional().describe("Array of user object IDs to set as group owners"),
  members: z.array(z.string()).optional().describe("Array of user object IDs to add as initial members"),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
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

  try {
    // Get authenticated user for audit logging
    getCurrentUser(`creating Entra group: ${displayName}`);

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

    let data = null;
    let message = "";

    try {
      // Check if group with same display name already exists
      const existingGroups = await graphApiRequest(
        "GET",
        `groups?$filter=displayName eq '${displayName.replace(/'/g, "''")}'`,
        graphConfig
      );

      if (existingGroups.value && existingGroups.value.length > 0) {
        data = existingGroups.value[0];
        message = `Entra group "${displayName}" already exists and is ready to use`;
      } else {
        throw new Error("Group not found"); // Force creation
      }
    } catch {
      // Group doesn't exist, create it
      try {
        data = await graphApiRequest(
          "POST",
          "groups",
          graphConfig,
          groupConfig
        );
        message = `Entra group "${displayName}" created successfully`;
      } catch (createError: any) {
        // Handle common conflicts
        if (createError.message.includes("already exists") || createError.message.includes("conflict")) {
          // Try to find the existing group
          const conflictGroups = await graphApiRequest(
            "GET",
            `groups?$filter=displayName eq '${displayName.replace(/'/g, "''")}'`,
            graphConfig
          );
          if (conflictGroups.value && conflictGroups.value.length > 0) {
            data = conflictGroups.value[0];
            message = `Entra group "${displayName}" already exists (detected after creation attempt)`;
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      }
    }

    return toolResponse({
      data,
      message,
      metadata: {
        group_id: data.id,
        display_name: displayName,
        security_enabled: securityEnabled,
        mail_enabled: mailEnabled,
        tenant_id: graphConfig.tenantId,
        action: message.includes("already exists") ? "verified" : "created"
      },
      links: {
        portal: `https://portal.azure.com/#view/Microsoft_AAD_IAM/GroupDetailsMenuBlade/~/Overview/groupId/${data.id}`
      }
    });

  } catch (error: any) {
    return toolResponse({
      message: `Failed to create Entra group: ${error.message}`,
      links: {
        docs: "https://docs.microsoft.com/en-us/graph/api/group-post-groups",
        troubleshooting: "https://docs.microsoft.com/en-us/graph/troubleshooting"
      },
      metadata: {
        display_name: displayName,
        troubleshooting: [
          "Check that you have Group.ReadWrite.All permissions",
          "Verify the display name is unique",
          "Ensure the mail nickname is valid and unique",
          "Review Microsoft Graph API documentation"
        ]
      }
    }, true);
  }
};

export const createEntraGroupTool: ToolDefinition = {
  title: "Create Entra Group",
  description: "Create or verify a new group in Microsoft Entra ID (Azure AD) via Microsoft Graph API. Idempotent operation that checks if a group with the same display name exists first. Supports security groups, Microsoft 365 groups, and distribution lists.",
  inputSchema,
  requiredPermissions: ["entra:admin", "entra:groups:create", "admin"],
  callback
};
