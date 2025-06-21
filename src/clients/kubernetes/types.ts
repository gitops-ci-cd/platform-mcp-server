// Kubernetes type definitions
export interface KubernetesConfig {
  kubeconfig?: string;
  context?: string;
  namespace?: string;
}

export interface KubernetesResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    [key: string]: any;
  };
  spec?: any;
  status?: any;
}

export interface KubernetesError extends Error {
  statusCode?: number;
  response?: any;
}

export const SUPPORTED_RESOURCE_KINDS = [
  "Pod",
  "Service",
  "Deployment",
  "ReplicaSet",
  "DaemonSet",
  "StatefulSet",
  "ConfigMap",
  "Secret",
  "Ingress",
  "Namespace",
  "Node"
] as const;

export type SupportedResourceKind = typeof SUPPORTED_RESOURCE_KINDS[number];
