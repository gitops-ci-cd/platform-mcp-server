import { ToolDefinition } from "./registry.js";
import * as k8s from "@kubernetes/client-node";
import {
  V1Deployment,
  V1DeploymentSpec,
  V1ObjectMeta,
  V1PodTemplateSpec,
} from "@kubernetes/client-node";

interface RestartServiceRequest {
  service: string;
  environment: string;
}

const restartServiceHandler: ToolDefinition["handler"] = async (args, _extra) => {
  const { service, environment } = args as RestartServiceRequest;

  try {
    // Load kubeconfig from default location
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);

    // Get the deployment
    // In Kubernetes client 1.x, the method signature has changed to accept a request object
    const deployment: V1Deployment = await appsV1Api.readNamespacedDeployment({
      name: service,
      namespace: environment,
    });

    // Add or update the annotation to trigger a restart
    if (!deployment.spec) {
      deployment.spec = {
        selector: { matchLabels: {} },
        template: {
          metadata: {
            annotations: {},
          },
          spec: {
            containers: [],
          },
        },
      } as V1DeploymentSpec;
    } else if (!deployment.spec.template) {
      deployment.spec.template = {
        metadata: {
          annotations: {},
        },
        spec: {
          containers: [],
        },
      } as V1PodTemplateSpec;
    } else if (!deployment.spec.template.metadata) {
      deployment.spec.template.metadata = {
        annotations: {},
      } as V1ObjectMeta;
    } else if (!deployment.spec.template.metadata.annotations) {
      deployment.spec.template.metadata.annotations = {};
    }

    // Set the restart annotation
    if (
      deployment.spec &&
      deployment.spec.template &&
      deployment.spec.template.metadata &&
      deployment.spec.template.metadata.annotations
    ) {
      deployment.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"] =
        new Date().toISOString();
    }

    // Update the deployment
    // In Kubernetes client 1.x, the method signature has changed to accept a request object
    await appsV1Api.replaceNamespacedDeployment({
      name: service,
      namespace: environment,
      body: deployment,
    });

    return {
      result: {
        message: `Service ${service} in environment ${environment} has been restarted successfully.`,
      },
      content: [],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to restart service ${service} in environment ${environment}: ${error.message}`,
        },
      ],
    };
  }
};

export const restartServiceTool: ToolDefinition = {
  name: "restartService",
  description: "Restart a Kubernetes service",
  handler: restartServiceHandler,
  // For future auth integration
  requiredPermissions: ["k8s:restart"],
};
