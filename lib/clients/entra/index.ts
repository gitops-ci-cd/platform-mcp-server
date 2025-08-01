// Entra ID client exports
export { getEntraConfig, buildGroupConfig } from "./config.js";
export {
  listGroups, readGroup, readGroupMembers, readGroupWithMembers, createGroup, upsertGroup, fetchUserGroups
} from "./client.js";
export {
  type EntraGroupConfig,
  type EntraGroupType,
  type EntraGroupVisibility,
  type EntraConfig,
  ENTRA_GROUP_TYPES,
  ENTRA_GROUP_VISIBILITY
} from "./types.js";
