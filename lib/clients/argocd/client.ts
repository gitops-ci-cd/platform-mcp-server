import type { ArgoCDConfig } from "./types.js";

/**
 * Make HTTP request to ArgoCD API with proper authentication
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param path API path (without /api/v1/ prefix)
 * @param config ArgoCD configuration
 * @param data Optional request body data
 * @returns Raw response containing ArgoCD API response data and headers
 * @throws Error if API request fails
 */
export const argoCDApiRequest = async ({ method = "GET", path, config, data }: {
  method?: string;
  path: string;
  config: ArgoCDConfig;
  data?: any
}): Promise<Response> => {
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

  if ([401, 403].includes(response.status) || response.status >= 500) {
    const cause = await response.json();
    throw new Error(response.statusText, { cause });
  }

  return response;
};
