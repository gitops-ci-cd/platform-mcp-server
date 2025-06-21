// Kubernetes client exports
export { getKubernetesConfig } from "./config.js";
export {
  getKubernetesClient,
  getResource,
  listResources,
  deleteResource,
  getResourceEvents,
  getResourceConfig
} from "./client.js";
export {
  type KubernetesConfig,
  type KubernetesResource,
  type KubernetesError,
  type SupportedResourceKind,
  SUPPORTED_RESOURCE_KINDS
} from "./types.js";
