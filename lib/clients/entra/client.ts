import { validate as validUUID } from "uuid";

import { resourceCache, checkCache } from "../../cache.js";
import { getGraphConfig, buildGroupConfig, getGraphAccessToken } from "./config.js";
import { EntraGroupConfig } from "./types.js";

/**
 * Make HTTP request to Microsoft Graph API with proper authentication
 * @param method HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param path API path (without /v1.0/ prefix)
 * @param config Graph API configuration
 * @param data Optional request body data
 * @param userToken Optional user token for on-behalf-of flow
 * @returns Promise with API response
 * @throws Error if API request fails
 */
export const graphApiRequest = async ({ method = "GET", path, config, data, userToken }: {
  method?: string;
  path: string;
  config: any; // Keep it flexible like vault client
  data?: any;
  userToken?: string;
}): Promise<any> => {
  const accessToken = await getGraphAccessToken({ userToken, config });
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph API error (${response.status}): ${errorText}`);
  }

  return await response.json();
};

/**
 * List all group names from Entra ID with caching
 * @param name Optional filter string for group names
 * @param userToken Optional user token for delegated permissions
 * @returns Promise with array of group display names
 */
export const listGroups = async ({ name, userToken }: {
  name?: string;
  userToken?: string
}): Promise<string[]> => {
  const cacheKey = userToken ? `entra-groups-${userToken.slice(-8)}` : "entra-groups";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    const config = getGraphConfig();

    // Get all groups with minimal fields for caching
    const queryParams = new URLSearchParams({
      "$select": "displayName",
      "$top": "999"
    });

    const response = await graphApiRequest({
      path: `groups?${queryParams.toString()}`,
      config,
      userToken
    });

    if (!response?.value) {
      return [];
    }

    // Extract just the display names and cache them for 30 minutes
    const groupNames = response.value.map((group: any) => group.displayName).sort();
    return resourceCache.set(cacheKey, groupNames, 30 * 60 * 1000);

  } catch (error) {
    console.warn("Could not fetch Entra groups:", error);
  }

  return [];
};

/**
 * Get a specific group by name or ID with detailed information
 * @param groupNameOrId The group display name or ID
 * @param includeMembers Whether to include group members (default: true)
 * @param userToken Optional user token for delegated permissions
 * @returns Promise with group data including members
 */
export const readGroup = async ({ groupNameOrId, includeMembers = true, userToken }: {
  groupNameOrId: string;
  includeMembers?: boolean;
  userToken?: string;
}): Promise<any> => {
  const config = getGraphConfig();
  const selectFields = "id,displayName,description,groupTypes,securityEnabled,mailEnabled,mail,visibility,createdDateTime";

  let group;

  if (validUUID(groupNameOrId)) {
    // Direct lookup by ID
    group = await graphApiRequest({
      path: `groups/${groupNameOrId}?$select=${selectFields}`,
      config,
      userToken
    });
  } else {
    // Search by display name
    const filter = `displayName eq '${groupNameOrId.replace(/'/g, "''")}'`;
    const searchResponse = await graphApiRequest({
      path: `groups?$filter=${encodeURIComponent(filter)}&$select=${selectFields}`,
      config,
      userToken
    });

    if (!searchResponse?.value || searchResponse.value.length === 0) {
      throw new Error(`Group not found: ${groupNameOrId}`);
    }

    if (searchResponse.value.length > 1) {
      throw new Error(`Multiple groups found with name: ${groupNameOrId}. Please use the group ID instead.`);
    }

    group = searchResponse.value[0];
  }

  if (includeMembers) {
    // Get group members
    const membersResponse = await graphApiRequest({
      path: `groups/${group.id}/members?$select=id,displayName,userPrincipalName,userType`,
      config,
      userToken
    });

    group.members = membersResponse?.value || [];
    group.memberCount = group.members.length;
  }

  return group;
};

/**
 * Create a new group in Entra ID with the provided configuration
 * @param options Group creation options
 * @param userToken Optional user token for delegated permissions
 * @returns Promise with created group data
 */
export const createGroup = async ({ options, userToken }: {
  options: EntraGroupConfig;
  userToken?: string
}): Promise<any> => {
  const config = getGraphConfig();
  const groupConfig = buildGroupConfig(options);

  return await graphApiRequest({
    path: "groups",
    method: "POST",
    data: groupConfig,
    config,
    userToken
  });
};
