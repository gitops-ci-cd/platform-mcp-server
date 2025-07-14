import { GraphConfig, EntraGroupConfig } from "./types.js";

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
 * Get access token for Microsoft Graph API using on-behalf-of flow
 * @param userToken Optional user JWT token for delegated permissions
 * @returns Access token string for Graph API calls
 * @throws Error if token acquisition fails
 */
export const getGraphAccessToken = async ({ config, userToken }: {
  config: GraphConfig;
  userToken?: string
}): Promise<string> => {
  // If token provided, bypass on-behalf-of flow and use token directly
  if (process.env.MS_ENTRA_TOKEN) return process.env.MS_ENTRA_TOKEN;

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  let tokenData: URLSearchParams;

  if (userToken) {
    // Use on-behalf-of flow to preserve user's identity and permissions
    tokenData = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/Group.ReadWrite.All https://graph.microsoft.com/User.Read.All",
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: userToken,
      requested_token_use: "on_behalf_of"
    });
  } else {
    // Fallback to client credentials flow (for system operations)
    tokenData = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
  }

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

const generateMailNickname = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 64);
};

const createUserReferences = (userIds: string[]): string[] => {
  return userIds.map(
    (userId) => `https://graph.microsoft.com/v1.0/users/${userId}`
  );
};
