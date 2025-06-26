import * as k8s from "@kubernetes/client-node";

/**
 * Load Kubernetes configuration from kubeconfig
 * @returns Kubernetes configuration object
 * @throws Error if kubeconfig cannot be loaded
 */
export const getKubernetesConfig = (filePath?: string): k8s.KubeConfig => {
  const kubeconfig = process.env.KUBECONFIG;

  const config = new k8s.KubeConfig();

  if (filePath) {
    // Use explicitly provided kubeconfig path
    config.loadFromFile(filePath);
  } else if (kubeconfig) {
    // Use KUBECONFIG environment variable (first file if multiple)
    const delimiter = process.platform === "win32" ? ";" : ":";
    const kubeconfigFiles = kubeconfig.split(delimiter).map(file => file.trim()).filter(Boolean);
    config.loadFromFile(kubeconfigFiles[0]);
  } else if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
    // We're running in a Kubernetes pod - use in-cluster configuration
    config.loadFromCluster();
  } else {
    // Try to load from default kubeconfig location (~/.kube/config)
    config.loadFromDefault();
  }

  return config;
};
