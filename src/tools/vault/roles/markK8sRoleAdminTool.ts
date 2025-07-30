import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { markKubernetesRoleAdmin } from "../../../../lib/clients/vault/index.js";

const inputSchema = z.object({
  cluster: z.string().describe("The Kubernetes cluster name (e.g., 'usw2')"),
  role: z.string().describe("The Vault Kubernetes role name (e.g., 'my-service-usw2-dev')"),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { cluster, role } = args as { cluster: string; role: string };

  const response = await markKubernetesRoleAdmin({ cluster, role });
  const json = await response.json();
  const data = json?.data || {};

  return toolResponse({
    data,
    message: `Marked Vault Kubernetes role '${role}' in cluster '${cluster}' as admin.`,
    metadata: {
      cluster,
      role
    },
    links: {
      concept: "TODO: Add link to kubernetes-roles plugin documentation",
    }
  });
};

export const markK8sAdminTool: ToolDefinition = {
  title: "Mark Kubernetes Role Admin",
  annotations: {
    openWorldHint: true,
    idempotentHint: true,
  },
  description: "Mark a Vault Kubernetes role as admin in the kubernetes-roles plugin.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:kubernetes-roles:admin"],
  callback
};
