// Kubernetes configuration utilities
import type { KubernetesConfig } from "./types.js";

/**
 * Load Kubernetes configuration from kubeconfig
 * @returns Kubernetes configuration object
 * @throws Error if kubeconfig cannot be loaded
 */
export const getKubernetesConfig = (): KubernetesConfig => {
  const kubeconfig = process.env.KUBECONFIG;
  const context = process.env.KUBE_CONTEXT;
  const namespace = process.env.KUBE_NAMESPACE || "default";

  return { kubeconfig, context, namespace };
};
