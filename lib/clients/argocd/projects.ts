import { argoCDApiRequest } from "./client.js";
import { getArgoCDConfig } from "./config.js";
import { resourceCache, checkCache } from "../../cache.js";

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
    const response = await argoCDApiRequest({
      path: "projects",
      config
    });
    const json = await response.json();

    if (!json?.items) {
      return [];
    }

    // Extract just the project names and sort them
    const list = json.items
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
export const readProject = async (name: string): Promise<Response> => {
  const config = getArgoCDConfig();
  const response = await argoCDApiRequest({
    path: `projects/${name}`,
    config
  });

  return response;
};

/**
 * Create a new ArgoCD project
 * @param projectData The project configuration object
 * @returns Promise with created project data
 */
export const createProject = async (data: any): Promise<Response> => {
  const config = getArgoCDConfig();
  const response = await argoCDApiRequest({
    method: "POST",
    path: "projects",
    config,
    data
  });

  return response;
};
