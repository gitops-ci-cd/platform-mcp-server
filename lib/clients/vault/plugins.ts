import { vaultApiRequest } from "./client.js";
import { getVaultConfig } from "./config.js";

/**
 * Mark a Kubernetes role as admin for a specific cluster
 * Grants administrative privileges to a Kubernetes role within the specified cluster.
 * This operation is typically used for managing cluster-level permissions through Vault.
 *
 * @param cluster Name of the Kubernetes cluster (e.g., 'prod', 'staging', 'dev')
 * @param role Name of the Kubernetes role to grant admin privileges (e.g., 'platform-admin', 'cluster-operator')
 * @returns Raw response containing role admin marking confirmation and metadata
 * @throws Error if role marking fails or cluster/role doesn't exist
 */
export const markKubernetesRoleAdmin = async ({
  cluster,
  role
}: {
  cluster: string,
  role: string
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: `kubernetes-roles/${cluster}/${role}/admin`,
    config,
    data: { force: true }
  });

  return response;
};
