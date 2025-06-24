// ArgoCD type definitions

/**
 * Common ArgoCD application source types
 */
export interface ArgoCDSource {
  repoURL: string;
  targetRevision?: string;
  path?: string;
  helm?: {
    releaseName?: string;
    values?: string;
    valueFiles?: string[];
    parameters?: Array<{ name: string; value: string }>;
  };
  kustomize?: {
    images?: string[];
    namePrefix?: string;
    nameSuffix?: string;
  };
}

/**
 * Common ArgoCD application destination
 */
export interface ArgoCDDestination {
  server?: string;
  namespace: string;
  name?: string;
}

/**
 * Common ArgoCD project resource restriction
 */
export interface ArgoCDResourceRestriction {
  group: string;
  kind: string;
}

/**
 * Common ArgoCD project role
 */
export interface ArgoCDProjectRole {
  name: string;
  description?: string;
  policies: string[];
  groups?: string[];
}
