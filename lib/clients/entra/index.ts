// Entra ID client exports
export { getGraphConfig, buildGroupConfig } from "./config.js";
export {
  listGroups,
  readGroup,
  createGroup
} from "./client.js";
export {
  type EntraGroupConfig,
  type EntraGroupType,
  type EntraGroupVisibility,
  type GraphConfig,
  ENTRA_GROUP_TYPES,
  ENTRA_GROUP_VISIBILITY
} from "./types.js";
