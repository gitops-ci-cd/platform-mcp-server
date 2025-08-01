import { EntraConfig, EntraGroupConfig } from "./types.js";
import { getCurrentUserToken } from "../../auth/index.js";

/**
 * Load Microsoft Graph configuration from environment variables
 * @returns Graph API configuration object
 * @throws Error if required environment variables are missing
 */
export const getEntraConfig = (): EntraConfig => {
  const { MS_ENTRA_TENANT_ID: tenantId } = process.env;
  const endpoint = "https://graph.microsoft.com/v1.0";

  if (!tenantId) {
    throw new Error("MS_ENTRA_TENANT_ID is required");
  }

  return {
    endpoint,
    tenantId
  };
};

/**
 * Get access token for Microsoft Graph API using on-behalf-of flow
 * @param config Graph API configuration
 * @returns Access token string for Graph API calls
 * @throws Error if token acquisition fails
 */
export const getGraphAccessToken = async ({ config }: {
  config: EntraConfig;
}): Promise<string> => {
  // If service token provided, use it directly
  if (process.env.MS_ENTRA_TOKEN) return process.env.MS_ENTRA_TOKEN;

  const userToken = getCurrentUserToken();

  let tokenData: URLSearchParams;

  if (userToken) {
    // Use on-behalf-of flow to preserve user's identity and permissions (preferred)
    tokenData = new URLSearchParams({
      scope: "https://graph.microsoft.com/Group.ReadWrite.All https://graph.microsoft.com/User.Read.All",
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: userToken,
      requested_token_use: "on_behalf_of"
    });
  } else {
    // Fallback to client credentials flow (for system operations)
    tokenData = new URLSearchParams({
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
  }

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
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
