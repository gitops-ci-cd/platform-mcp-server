import { ResourceDefinition } from "../registry.js";
import { getGraphConfig, graphApiRequest } from "../../clients/entra/index.js";

// Read callback function for Entra groups resource
const readCallback: ResourceDefinition["readCallback"] = async (uri) => {
  try {
    // Load Graph API configuration
    const graphConfig = getGraphConfig();

    // Query parameters for groups
    const selectFields = "id,displayName,description,groupTypes,securityEnabled,mailEnabled,mail,visibility,createdDateTime";
    const queryParams = `$select=${selectFields}&$top=100`;

    // List groups from Microsoft Graph
    const groupsResponse = await graphApiRequest(
      "GET",
      `groups?${queryParams}`,
      graphConfig
    );

    if (!groupsResponse?.value) {
      throw new Error("No groups data returned from Microsoft Graph");
    }

    // Transform groups data with action-oriented information
    const groups = groupsResponse.value.map((group: any) => {
      const groupType = group.groupTypes?.includes("Unified") ? "Microsoft 365" :
        group.securityEnabled && !group.mailEnabled ? "Security" :
          !group.securityEnabled && group.mailEnabled ? "Distribution" :
            "Unknown";

      const azurePortalUrl = `https://portal.azure.com/#blade/Microsoft_AAD_IAM/GroupDetailsMenuBlade/Overview/groupId/${group.id}`;

      return {
        id: group.id,
        displayName: group.displayName,
        description: group.description || "",
        type: groupType,
        securityEnabled: group.securityEnabled,
        mailEnabled: group.mailEnabled,
        mail: group.mail,
        visibility: group.visibility,
        createdDateTime: group.createdDateTime,
        actions: {
          view: azurePortalUrl,
          members: `https://portal.azure.com/#blade/Microsoft_AAD_IAM/GroupDetailsMenuBlade/Members/groupId/${group.id}`,
          owners: `https://portal.azure.com/#blade/Microsoft_AAD_IAM/GroupDetailsMenuBlade/Owners/groupId/${group.id}`,
          settings: `https://portal.azure.com/#blade/Microsoft_AAD_IAM/GroupDetailsMenuBlade/Properties/groupId/${group.id}`,
        },
        management_info: {
          portal_url: azurePortalUrl,
          graph_api_url: `${graphConfig.endpoint}/v1.0/groups/${group.id}`,
          created_at: group.createdDateTime,
        }
      };
    });

    const resourceData = {
      groups,
      summary: {
        total_count: groups.length,
        by_type: groups.reduce((acc: any, group: any) => {
          acc[group.type] = (acc[group.type] || 0) + 1;
          return acc;
        }, {}),
        security_enabled: groups.filter((g: any) => g.securityEnabled).length,
        mail_enabled: groups.filter((g: any) => g.mailEnabled).length,
        with_mail: groups.filter((g: any) => g.mail).length,
      },
      entra_info: {
        endpoint: graphConfig.endpoint,
        portal_url: "https://portal.azure.com/#blade/Microsoft_AAD_IAM/GroupsManagementMenuBlade/AllGroups",
        docs: "https://docs.microsoft.com/en-us/graph/api/group-list",
      },
      next_actions: {
        create_new_group: "Use createEntraGroup tool to add a new group",
        manage_members: "Click 'members' links to manage group membership",
        view_portal: "Visit Azure Portal to manage groups via web interface",
        learn_more: "Visit the Microsoft Graph documentation for group management guides",
      }
    };

    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(resourceData, null, 2)
        }
      ]
    };

  } catch (error: any) {
    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify({
            error: `Failed to read Entra groups: ${error.message}`,
            troubleshooting: {
              check_entra_token: "Ensure ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET, and ENTRA_TENANT_ID environment variables are set",
              check_permissions: "Verify your app registration has Group.Read.All permissions",
              entra_docs: "https://docs.microsoft.com/en-us/graph/api/group-list",
            }
          }, null, 2)
        }
      ]
    };
  }
};

// Resource definition for Entra groups
export const entraGroupsResource: ResourceDefinition = {
  uri: "entra://groups",
  title: "Entra ID Groups",
  metadata: {
    description: "List of all Entra ID (Azure AD) groups with management links and member details",
  },
  requiredPermissions: ["entra:read", "entra:groups:list", "admin"],
  readCallback,
};
