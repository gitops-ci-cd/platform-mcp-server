/**
 * Configuration for MS Entra ID authentication
 */
export interface EntraConfig {
  tenantId: string;
  clientId: string;
}

/**
 * Load Entra ID configuration from environment
 */
export const loadEntraConfig = (): EntraConfig => {
  const { MS_ENTRA_TENANT_ID: tenantId, MS_ENTRA_CLIENT_ID: clientId } = process.env;

  if (!tenantId || !clientId) {
    throw new Error("MS_ENTRA_TENANT_ID and MS_ENTRA_CLIENT_ID are required");
  }

  return {
    tenantId,
    clientId
  };
};
