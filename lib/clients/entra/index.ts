// Entra ID client exports
export { getGraphConfig } from "./config.js";
export {
  getGraphAccessToken,
  graphApiRequest,
  generateMailNickname,
  createUserReferences,
  buildGroupConfig,
  listGroups,
  readGroup
} from "./client.js";
export {
  type EntraGroupConfig,
  type EntraGroupType,
  type EntraGroupVisibility,
  type GraphConfig,
  ENTRA_GROUP_TYPES,
  ENTRA_GROUP_VISIBILITY
} from "./types.js";
