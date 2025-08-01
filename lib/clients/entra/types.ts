/**
 * Common Entra ID group types
 */
export const ENTRA_GROUP_TYPES = ["Unified", "DynamicMembership"] as const;
export type EntraGroupType = typeof ENTRA_GROUP_TYPES[number];

/**
 * Common Entra ID group visibility options
 */
export const ENTRA_GROUP_VISIBILITY = ["Private", "Public", "HiddenMembership"] as const;
export type EntraGroupVisibility = typeof ENTRA_GROUP_VISIBILITY[number];

/**
 * Common Entra ID group configuration interface
 */
export interface EntraGroupConfig {
  displayName: string;
  description?: string;
  mailNickname?: string;
  groupTypes?: EntraGroupType[];
  securityEnabled?: boolean;
  mailEnabled?: boolean;
  visibility?: EntraGroupVisibility;
  owners?: string[];
  members?: string[];
}

export interface EntraConfig {
  endpoint: string;
  tenantId: string;
}
