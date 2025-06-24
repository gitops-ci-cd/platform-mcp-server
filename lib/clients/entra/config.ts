import { GraphConfig } from "./types.js";

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
