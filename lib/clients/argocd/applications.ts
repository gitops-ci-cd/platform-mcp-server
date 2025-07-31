import { argoCDApiRequest } from "./client.js";
import { getArgoCDConfig } from "./config.js";
import { resourceCache, checkCache } from "../../cache.js";

/**
 * List all ArgoCD applications
 * @returns Promise with array of application names
 */
export const listApplications = async (name?: string): Promise<string[]> => {
  const cacheKey = "argo-applications";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    const config = getArgoCDConfig();
    const response = await argoCDApiRequest({
      path: "applications",
      config
    });
    const json = await response.json();

    if (!json?.items) {
      return [];
    }

    // Extract just the application names and sort them
    const list = json.items
      .map((app: any) => app.metadata?.name)
      .filter((name: string) => name)
      .sort();

    return resourceCache.set(cacheKey, list, 30 * 60 * 1000);
  } catch (error) {
    console.warn("Could not fetch ArgoCD applications:", error);
    return [];
  }
};

/**
 * Get a specific ArgoCD application by name
 * @param applicationName The application name
 * @returns Promise with application data
 */
export const readApplication = async (name: string): Promise<Response> => {
  const config = getArgoCDConfig();
  const response = await argoCDApiRequest({
    path: `applications/${name}`,
    config
  });

  return response;
};

/**
 * Create a new ArgoCD application
 * @param applicationData The application configuration object
 * @returns Promise with created application data
 */
export const createApplication = async (data: any): Promise<Response> => {
  const config = getArgoCDConfig();
  const response = await argoCDApiRequest({
    method: "POST",
    path: "applications",
    config,
    data
  });

  return response;
};
