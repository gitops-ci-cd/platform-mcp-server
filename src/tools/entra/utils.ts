// Common utilities for Microsoft Entra ID (Azure AD) / Graph API interactions

export interface GraphConfig {
  endpoint: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Load Microsoft Graph configuration from environment variables
 * @returns Graph API configuration object
 * @throws Error if required environment variables are missing
 */
export const getGraphConfig = (): GraphConfig => {
  const endpoint = "https://graph.microsoft.com/v1.0";
  const tenantId = process.env.MS_ENTRA_TENANT_ID;
  const clientId = process.env.MS_ENTRA_CLIENT_ID;
  const clientSecret = process.env.MS_ENTRA_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("MS_ENTRA_TENANT_ID, MS_ENTRA_CLIENT_ID, and MS_ENTRA_CLIENT_SECRET environment variables are required");
  }

  return { endpoint, tenantId, clientId, clientSecret };
};

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
 * Common Entra ID group types
 */
export const ENTRA_GROUP_TYPES = ["Unified", "DynamicMembership"] as const;
export type EntraGroupType = typeof ENTRA_GROUP_TYPES[number];

/**
 * Common Entra ID group visibility options
 */
export const ENTRA_GROUP_VISIBILITY = ["Private", "Public", "HiddenMembership"] as const;
export type EntraGroupVisibility = typeof ENTRA_GROUP_VISIBILITY[number];

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
 * Common Entra ID group configuration interface
 */
export interface EntraGroupConfig {
  displayName: string;
  description?: string;
  mailNickname?: string;
  groupTypes?: EntraGroupType[];
  securityEnabled?: boolean;
  mailEnabled?: boolean;
  visibility?: EntraGroupVisibility;
  owners?: string[];
  members?: string[];
}

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
