import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import {
  createGroup,
  readGroup,
  ENTRA_GROUP_TYPES,
  ENTRA_GROUP_VISIBILITY,
  type EntraGroupConfig
} from "../../../../lib/clients/entra/index.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";

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
    // Get authenticated user for audit logging and token access
    getCurrentUser(`creating Entra group: ${displayName}`);

    let data = null;
    let message = "";

    try {
      // Check if group with same display name already exists
      data = await readGroup({
        groupNameOrId: displayName,
        includeMembers: true
      });
      message = `Entra group "${displayName}" already exists and is ready to use`;
    } catch {
      // Group doesn't exist, create it
      try {
        data = await createGroup({
          options: {
            displayName,
            description,
            mailNickname,
            groupTypes,
            securityEnabled,
            mailEnabled,
            visibility,
            owners,
            members
          }
        });
        message = `Entra group "${displayName}" created successfully`;
      } catch (createError: any) {
        // Handle common conflicts - try to read the group again
        if (createError.message.includes("already exists") || createError.message.includes("conflict")) {
          try {
            data = await readGroup({
              groupNameOrId: displayName,
              includeMembers: true
            });
            message = `Entra group "${displayName}" already exists (detected after creation attempt)`;
          } catch {
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
        name: displayName,
        group_id: data.id,
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
        name: displayName,
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
  annotations: {
    openWorldHint: true,
    idempotentHint: true,
  },
  description: "Create or verify a new group in Microsoft Entra ID (Azure AD) via Microsoft Graph API. Supports security groups, Microsoft 365 groups, and distribution lists.",
  inputSchema,
  requiredPermissions: ["entra:admin", "entra:groups:create", "admin"],
  callback
};
