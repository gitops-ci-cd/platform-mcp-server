import { validate as validUUID } from "uuid";

import type { EntraGroupConfig, GraphConfig } from "./types.js";
import { resourceCache, checkCache } from "../../cache.js";

/**
 * Get access token for Microsoft Graph API using client credentials flow
 * @param config Graph API configuration
 * @returns Access token string
 * @throws Error if token acquisition fails
 */
export const getGraphAccessToken = async (config: GraphConfig): Promise<string> => {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  const tokenData = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  const tokenResponse = await response.json();
  return tokenResponse.access_token;
};

/**
 * Make HTTP request to Microsoft Graph API with proper authentication
 * @param method HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param path API path (without /v1.0/ prefix)
 * @param config Graph API configuration
 * @param data Optional request body data
 * @returns Promise with API response
 * @throws Error if API request fails
 */
export const graphApiRequest = async (
  method: string,
  path: string,
  config: GraphConfig,
  data?: any
): Promise<any> => {
  const accessToken = await getGraphAccessToken(config);
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
 * Generate a safe mail nickname from display name
 * @param displayName The group display name
 * @returns A safe mail nickname (lowercase, alphanumeric, max 64 chars)
 */
export const generateMailNickname = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 64);
};

/**
 * Create user reference URLs for Graph API operations
 * @param userIds Array of user object IDs
 * @returns Array of Graph API user reference URLs
 */
export const createUserReferences = (userIds: string[]): string[] => {
  return userIds.map(
    (userId) => `https://graph.microsoft.com/v1.0/users/${userId}`
  );
};

/**
 * Build a complete group configuration object with defaults
 * @param config Partial group configuration
 * @returns Complete group configuration with defaults applied
 */
export const buildGroupConfig = (config: EntraGroupConfig): any => {
  const groupConfig: any = {
    displayName: config.displayName,
    mailEnabled: config.mailEnabled !== false, // Default to true
    securityEnabled: config.securityEnabled !== false, // Default to true
  };

  if (config.description) {
    groupConfig.description = config.description;
  }

  // Set mail nickname
  if (config.mailNickname) {
    groupConfig.mailNickname = config.mailNickname;
  } else {
    groupConfig.mailNickname = generateMailNickname(config.displayName);
  }

  // Set group types
  if (config.groupTypes && config.groupTypes.length > 0) {
    groupConfig.groupTypes = config.groupTypes;
  } else {
    groupConfig.groupTypes = []; // Regular group
  }

  // Set visibility
  if (config.visibility) {
    groupConfig.visibility = config.visibility;
  }

  // Add owners if provided
  if (config.owners && config.owners.length > 0) {
    groupConfig["owners@odata.bind"] = createUserReferences(config.owners);
  }

  // Add members if provided
  if (config.members && config.members.length > 0) {
    groupConfig["members@odata.bind"] = createUserReferences(config.members);
  }

  return groupConfig;
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
    const config = await import("./config.js").then(m => m.getGraphConfig());

    // Get all groups with minimal fields for caching
    const queryParams = new URLSearchParams({
      "$select": "displayName",
      "$top": "999" // Get as many as possible for caching
    });

    const response = await graphApiRequest("GET", `groups?${queryParams.toString()}`, config);

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
 * @param config Graph API configuration
 * @param includeMembers Whether to include group members (default: true)
 * @returns Promise with group data including members
 */
export const readGroup = async (groupNameOrId: string, config: GraphConfig, includeMembers: boolean = true): Promise<any> => {
  const selectFields = "id,displayName,description,groupTypes,securityEnabled,mailEnabled,mail,visibility,createdDateTime";

  let group;

  if (validUUID(groupNameOrId)) {
    // Direct lookup by ID
    group = await graphApiRequest("GET", `groups/${groupNameOrId}?$select=${selectFields}`, config);
  } else {
    // Search by display name
    const filter = `displayName eq '${groupNameOrId.replace(/'/g, "''")}'`; // Escape single quotes
    const searchResponse = await graphApiRequest(
      "GET",
      `groups?$filter=${encodeURIComponent(filter)}&$select=${selectFields}`,
      config
    );

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
    const membersResponse = await graphApiRequest(
      "GET",
      `groups/${group.id}/members?$select=id,displayName,userPrincipalName,userType`,
      config
    );

    group.members = membersResponse?.value || [];
    group.memberCount = group.members.length;
  }

  return group;
};
