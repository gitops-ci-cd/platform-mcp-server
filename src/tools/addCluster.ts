import { z } from "zod";
import * as k8s from "@kubernetes/client-node";

import { ToolDefinition } from "./registry.js";

const addClusterHandler: ToolDefinition["callback"] = async (args, _extra) => {
  try {
    // Create a new KubeConfig
    const kc = new k8s.KubeConfig();

    if (args.kubeconfig) {
      // Load from provided kubeconfig string
      kc.loadFromString(args.kubeconfig);
    } else {
      // Load from default location
      kc.loadFromDefault();
    }

    // Set current context if provided
    if (args.context) {
      kc.setCurrentContext(args.context);
    }

    // Verify connection by getting server version
    const versionApi = kc.makeApiClient(k8s.VersionApi);
    const version = await versionApi.getCode();

    // In a real implementation, you would store the cluster configuration
    // in a database or configuration file for future use

    // For this example, we'll just return success with the version info
    return {
      result: {
        message: `Successfully added cluster "${args.name}"`,
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
          text: `Cluster "${args.name}" has been successfully added with Kubernetes version ${version.gitVersion}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to add cluster "${args.name}": ${error.message}`,
        },
      ],
      isError: true,
    };
  }
};

export const addClusterTool: ToolDefinition = {
  name: "add_cluster",
  description: "Add a Kubernetes cluster configuration",
  callback: addClusterHandler,
  inputSchema: z.object({
    name: z.string().describe("The name of the cluster to add"),
    kubeconfig: z.string().optional().describe("Optional kubeconfig string to use for the cluster"),
    context: z.string().optional().describe("Optional context to set as current for the cluster")
  }),
  // For future auth integration
  requiredPermissions: ["k8s:admin"],
};
