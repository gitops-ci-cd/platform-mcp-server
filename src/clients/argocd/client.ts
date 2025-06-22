// ArgoCD API client utilities
import type { ArgoCDConfig } from "./config.js";

/**
 * Make HTTP request to ArgoCD API with proper authentication
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param path API path (without /api/v1/ prefix)
 * @param config ArgoCD configuration
 * @param data Optional request body data
 * @returns Promise with API response
 * @throws Error if API request fails
 */
export const argoCDApiRequest = async (
  method: string,
  path: string,
  config: ArgoCDConfig,
  data?: any
): Promise<any> => {
  const url = `${config.endpoint}/api/v1/${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.token}`,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ArgoCD API error (${response.status}): ${errorText}`);
  }

  return await response.json();
};
