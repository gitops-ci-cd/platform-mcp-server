// Vault type definitions

/**
 * Common Vault engine types supported by the API
 */
export const VAULT_ENGINE_TYPES = [
  "kv",
  "kv-v2",
  "database",
  "pki",
  "transit",
  "aws",
  "azure",
  "gcp",
  "kubernetes",
  "ldap",
  "approle",
  "userpass",
  "cert",
  "ssh",
  "totp",
  "nomad",
  "consul",
  "rabbitmq",
  "ad",
  "alicloud",
] as const;
