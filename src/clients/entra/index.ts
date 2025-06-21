// Entra ID client exports
export { getGraphConfig, type GraphConfig } from "./config.js";
export {
  getGraphAccessToken,
  graphApiRequest,
  generateMailNickname,
  createUserReferences,
  buildGroupConfig
} from "./client.js";
export {
  type EntraGroupConfig,
  type EntraGroupType,
  type EntraGroupVisibility,
  ENTRA_GROUP_TYPES,
  ENTRA_GROUP_VISIBILITY
} from "./types.js";
