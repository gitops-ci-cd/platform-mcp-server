// ArgoCD configuration utilities

export interface ArgoCDConfig {
  endpoint: string;
  token: string;
}

/**
 * Load ArgoCD configuration from environment variables
 * @returns ArgoCD configuration object
 * @throws Error if required environment variables are missing
 */
export const getArgoCDConfig = (): ArgoCDConfig => {
  const endpoint = process.env.ARGOCD_SERVER || "https://argocd.legalzoom.com";
  const token = process.env.ARGOCD_TOKEN;

  if (!token) {
    throw new Error("ARGOCD_TOKEN environment variable is required");
  }

  return { endpoint, token };
};
