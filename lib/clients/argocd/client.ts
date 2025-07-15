// ArgoCD API client utilities
import type { ArgoCDConfig } from "./types.js";
import { getArgoCDConfig } from "./config.js";
import { resourceCache, checkCache } from "../../cache.js";

/**
 * Make HTTP request to ArgoCD API with proper authentication
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param path API path (without /api/v1/ prefix)
 * @param config ArgoCD configuration
 * @param data Optional request body data
 * @returns Promise with API response
 * @throws Error if API request fails
 */
export const argoCDApiRequest = async ({ method = "GET", path, config, data }: {
  method?: string;
  path: string;
  config: ArgoCDConfig;
  data?: any
}): Promise<any> => {
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

/**
 * List all ArgoCD projects
 * @returns Promise with array of project names
 */
export const listProjects = async (name?: string): Promise<string[]> => {
  const cacheKey = "argo-projects";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    const config = getArgoCDConfig();
    const projectsResponse = await argoCDApiRequest({
      path: "projects",
      config
    });

    if (!projectsResponse?.items) {
      return [];
    }

    // Extract just the project names and sort them
    const list = projectsResponse.items
      .map((project: any) => project.metadata?.name)
      .filter((name: string) => name)
      .sort();

    return resourceCache.set(cacheKey, list, 30 * 60 * 1000);
  } catch (error) {
    console.warn("Could not fetch ArgoCD projects:", error);
    return [];
  }
};

/**
 * Get a specific ArgoCD project by name
 * @param projectName The project name
 * @returns Promise with project data
 */
export const readProject = async (name: string): Promise<any> => {
  const config = getArgoCDConfig();
  const response = await argoCDApiRequest({
    path: `projects/${name}`,
    config
  });

  return response;
};

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
    const appsResponse = await argoCDApiRequest({
      path: "applications",
      config
    });

    if (!appsResponse?.items) {
      return [];
    }

    // Extract just the application names and sort them
    const list = appsResponse.items
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
export const readApplication = async (name: string): Promise<any> => {
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
export const createApplication = async (data: any): Promise<any> => {
  const config = getArgoCDConfig();
  const response = await argoCDApiRequest({
    method: "POST",
    path: "applications",
    config,
    data
  });

  return response;
};

/**
 * Create a new ArgoCD project
 * @param projectData The project configuration object
 * @returns Promise with created project data
 */
export const createProject = async (data: any): Promise<any> => {
  const config = getArgoCDConfig();
  const response = await argoCDApiRequest({
    method: "POST",
    path: "projects",
    config,
    data
  });

  return response;
};
