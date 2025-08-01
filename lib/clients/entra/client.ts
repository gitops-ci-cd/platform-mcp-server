import { validate as validUUID } from "uuid";

import { resourceCache, checkCache } from "../../cache.js";
import { getEntraConfig, buildGroupConfig, getGraphAccessToken } from "./config.js";
import { EntraGroupConfig, EntraConfig } from "./types.js";

/**
 * Fetch user's group memberships from Microsoft Graph using an access token
 * @param token The user's access token
 * @returns Array of group display names or IDs
 */
export const fetchUserGroups = async (token: string): Promise<string[]> => {
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/memberOf", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Failed to fetch user groups from Microsoft Graph:", response.status);
      return [];
    }

    const data = await response.json();
    return data.value?.map((group: any) => group.displayName || group.id) || [];
  } catch (error) {
    console.warn("Error fetching user groups:", error);
    return [];
  }
};

/**
 * Make HTTP request to Microsoft Graph API with proper authentication
 * @param method HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param path API path (without /v1.0/ prefix)
 * @param config Graph API configuration
 * @param data Optional request body data
 * @returns Raw response containing Graph API response data and headers
 * @throws Error if API request fails
 */
export const graphApiRequest = async ({ method = "GET", path, config, data }: {
  method?: string;
  path: string;
  config: EntraConfig;
  data?: any;
}): Promise<Response> => {
  const accessToken = await getGraphAccessToken({ config });
  const url = `${config.endpoint}/${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if ([401, 403].includes(response.status) || response.status >= 500) {
    const cause = await response.json();
    throw new Error(response.statusText, { cause });
  }

  return response;
};

/**
 * List all group names from Entra ID with caching
 * @param name Optional filter string for group names
 * @returns Promise with array of group display names
 */
export const listGroups = async (name?: string): Promise<string[]> => {
  const cacheKey = "entra-groups";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    const config = getEntraConfig();
    let allGroups: any[] = [];
    let nextLink: string | undefined;

    // Get all groups with pagination
    const queryParams = new URLSearchParams({
      "$select": "displayName",
      "$top": "999" // Max per page
    });

    let currentPath = `groups?${queryParams.toString()}`;

    do {
      const response = await graphApiRequest({
        path: currentPath,
        config
      });
      const json = await response.json();

      if (json?.value) {
        allGroups.push(...json.value);
      }

      // Check for next page
      nextLink = json?.["@odata.nextLink"];
      if (nextLink) {
        // Extract just the query portion from the nextLink URL
        const url = new URL(nextLink);
        currentPath = `groups${url.search}`;
      }
    } while (nextLink);

    // Extract just the display names and cache them for 30 minutes
    const groupNames = allGroups.map((group: any) => group.displayName).sort();

    return resourceCache.set(cacheKey, groupNames, 30 * 60 * 1000);
  } catch (error) {
    console.warn("Could not fetch Entra groups:", error);
  }

  return [];
};

/**
 * Get a specific group by name or ID
 * @param groupNameOrId The group display name or ID
 * @returns Raw response containing group data
 */
export const readGroup = async (groupNameOrId: string): Promise<Response> => {
  const config = getEntraConfig();
  const selectFields = "id,displayName,description,groupTypes,securityEnabled,mailEnabled,mail,visibility,createdDateTime";

  if (validUUID(groupNameOrId)) {
    // Direct lookup by ID
    return await graphApiRequest({
      path: `groups/${groupNameOrId}?$select=${selectFields}`,
      config
    });
  } else {
    // Search by display name
    const filter = `displayName eq '${groupNameOrId.replace(/'/g, "''")}'`;
    const response = await graphApiRequest({
      path: `groups?$filter=${encodeURIComponent(filter)}&$select=${selectFields}`,
      config
    });
    const json = await response.json();

    if (!json?.value || json.value.length === 0) {
      return new Response(JSON.stringify({ error: "Group not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (json.value.length > 1) {
      return new Response(JSON.stringify({ error: "Multiple groups found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Return the single group data
    return new Response(JSON.stringify(json.value[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};

/**
 * Get members for a specific group
 * @param groupId The group ID
 * @returns Raw response containing group members data
 */
export const readGroupMembers = async (groupId: string): Promise<Response> => {
  const config = getEntraConfig();
  return await graphApiRequest({
    path: `groups/${groupId}/members?$select=id,displayName,userPrincipalName,userType`,
    config
  });
};

/**
 * Get a group with its members included
 * Higher-level function that combines group and member data
 * @param groupNameOrId The group display name or ID
 * @returns Combined group data with members
 */
export const readGroupWithMembers = async (groupNameOrId: string) => {
  const groupResponse = await readGroup(groupNameOrId);

  if (groupResponse.status !== 200) {
    // Return early if group lookup failed
    const errorData = await groupResponse.json();
    throw new Error(errorData.error || `Failed to read group: ${groupResponse.status}`);
  }

  const groupData = await groupResponse.json();

  const membersResponse = await readGroupMembers(groupData.id);
  const membersData = await membersResponse.json();

  return {
    ...groupData,
    members: membersData?.value || [],
    memberCount: membersData?.value?.length || 0
  };
};

/**
 * Create a new group in Entra ID with the provided configuration
 * @param options Group creation options
 * @returns Promise with created group data
 */
export const createGroup = async ({ options }: {
  options: EntraGroupConfig;
}): Promise<Response> => {
  const config = getEntraConfig();
  const groupConfig = buildGroupConfig(options);

  const response = await graphApiRequest({
    path: "groups",
    method: "POST",
    data: groupConfig,
    config
  });

  return response;
};

/**
 * Create or verify a group in Microsoft Entra ID
 * This function handles the complete flow of group creation/verification.
 * If the group doesn't exist, it creates a new one. If it exists, it returns the existing group.
 *
 * @param options Group configuration options
 * @returns Raw response containing final group details after upsert operation
 * @throws Error if group operations fail or configuration is invalid
 */
export const upsertGroup = async ({ options }: {
  options: EntraGroupConfig;
}): Promise<Response> => {
  // First, try to read the existing group
  const response = await readGroup(options.displayName);

  if (response.status === 404) {
    // Group doesn't exist, create it
    await createGroup({ options });
    return await readGroup(options.displayName);
  } else if (response.status >= 200 && response.status < 300) {
    // Group already exists, return it
    return response;
  } else {
    // Some other error occurred
    const errorText = await response.text();
    throw new Error(`Failed to read group: ${response.status} : ${errorText}`);
  }
};
