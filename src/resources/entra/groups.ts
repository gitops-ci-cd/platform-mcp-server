import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { readGroup, listGroups } from "../../../lib/clients/entra/index.js";
import { getCurrentUserSilent } from "../../../lib/auth/context.js";

// Read callback function for Entra group resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables, _extra) => {
  const { groupName } = variables as { groupName: string };

  if (!groupName) {
    throw new Error("Group name is required");
  }

  try {
    // Get user context for delegated permissions
    const user = getCurrentUserSilent();

    // Use client function to get group with members (accepts name or ID)
    const data = await readGroup({ groupNameOrId: groupName, includeMembers: true, userToken: user.token });

    return resourceResponse({
      message: `Entra ID group: ${data.displayName}`,
      data,
      links: {
        ui: `https://portal.azure.com/#blade/Microsoft_AAD_IAM/GroupDetailsMenuBlade/Overview/groupId/${data.id}`,
        docs: "https://docs.microsoft.com/en-us/graph/api/group-get",
        api_docs: "https://docs.microsoft.com/en-us/graph/api/group-get"
      },
      metadata: {
        potentialActions: [
          "Use createEntraGroup tool to create similar groups",
          "Click 'members' link to manage group membership",
          "Visit Azure Portal to manage this group",
          "Check group permissions and access rights"
        ]
      }
    }, uri);

  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Entra group: ${error.message}`,
      links: {
        docs: "https://docs.microsoft.com/en-us/graph/api/group-get",
        troubleshooting: "https://docs.microsoft.com/en-us/graph/troubleshooting"
      },
      metadata: {
        troubleshooting: [
          "Verify the group ID exists",
          "Ensure ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET, and ENTRA_TENANT_ID environment variables are set",
          "Verify your app registration has Group.Read.All permissions",
          "Check Microsoft Graph API connectivity and service status"
        ]
      }
    }, uri);
  }
};

// Resource template definition for Entra groups
export const entraGroupsTemplate: ResourceTemplateDefinition = {
  title: "Entra Groups",
  resourceTemplate: new ResourceTemplate(
    "entra://groups/{groupName}",
    {
      list: undefined,
      complete: {
        groupName: async (value: string): Promise<string[]> => {
          try {
            // Get user context for delegated permissions
            const user = getCurrentUserSilent();
            return await listGroups({ name: value, userToken: user.token });
          } catch (error) {
            console.error("Error in group autocomplete:", error);
            return [];
          }
        }
      }
    }
  ),
  metadata: {
    description: "Access specific Entra ID (Azure AD) groups by name or ID. Provides group details, member list, and management actions",
  },
  requiredPermissions: ["entra:read", "entra:groups:read", "admin"],
  readCallback,
};
