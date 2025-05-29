import { ToolDefinition } from "./registry.js";
import * as k8s from "@kubernetes/client-node";

interface AddClusterRequest {
  name: string;
  kubeconfig?: string;
  context?: string;
}

const addClusterHandler: ToolDefinition["handler"] = async (args, _extra) => {
  const { name, kubeconfig, context } = args as AddClusterRequest;

  try {
    // Create a new KubeConfig
    const kc = new k8s.KubeConfig();

    if (kubeconfig) {
      // Load from provided kubeconfig string
      kc.loadFromString(kubeconfig);
    } else {
      // Load from default location
      kc.loadFromDefault();
    }

    // Set current context if provided
    if (context) {
      kc.setCurrentContext(context);
    }

    // Verify connection by getting server version
    const versionApi = kc.makeApiClient(k8s.VersionApi);
    const version = await versionApi.getCode();

    // In a real implementation, you would store the cluster configuration
    // in a database or configuration file for future use

    // For this example, we'll just return success with the version info
    return {
      result: {
        message: `Successfully added cluster "${name}"`,
        serverVersion: version.gitVersion,
        serverInfo: {
          major: version.major,
          minor: version.minor,
          platform: version.platform,
        },
      },
      content: [
        {
          type: "text",
          text: `Cluster "${name}" has been successfully added with Kubernetes version ${version.gitVersion}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to add cluster "${name}": ${error.message}`,
        },
      ],
      isError: true,
    };
  }
};

export const addClusterTool: ToolDefinition = {
  name: "add_cluster",
  description: "Add a Kubernetes cluster configuration",
  handler: addClusterHandler,
  // For future auth integration
  requiredPermissions: ["k8s:admin"],
};
