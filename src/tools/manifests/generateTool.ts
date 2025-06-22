import { z } from "zod";
import { ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { ToolDefinition, toolResponse } from "../registry.js";

// Example mappings with reference links
const MANIFEST_EXAMPLES = {
  kubernetes: {
    deployment: {
      description: "Kubernetes Deployment for running stateless applications",
      examples: [
        "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
        "https://github.com/kubernetes/examples/blob/master/staging/deployment/deployment.yaml"
      ]
    },
    service: {
      description: "Kubernetes Service for exposing applications",
      examples: [
        "https://kubernetes.io/docs/concepts/services-networking/service/",
        "https://github.com/kubernetes/examples/blob/master/staging/service/frontend-service.yaml"
      ]
    },
    namespace: {
      description: "Kubernetes Namespace for resource isolation",
      examples: [
        "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/",
        "https://github.com/kubernetes/examples/blob/master/staging/namespace/namespace.yaml"
      ]
    },
    configmap: {
      description: "Kubernetes ConfigMap for configuration data",
      examples: [
        "https://kubernetes.io/docs/concepts/configuration/configmap/",
        "https://github.com/kubernetes/examples/blob/master/staging/configmap/configmap.yaml"
      ]
    },
    externalSecret: {
      description: "Kubernetes operator that integrates with Vault",
      examples: [
        "https://external-secrets.io/latest/api/externalsecret/",
        "https://external-secrets.io/latest/provider/hashicorp-vault/"
      ]
    },
    ingress: {
      description: "Kubernetes Ingress for HTTP/HTTPS routing",
      examples: [
        "https://kubernetes.io/docs/concepts/services-networking/ingress/",
        "https://github.com/kubernetes/examples/blob/master/staging/ingress/ingress.yaml"
      ]
    },
    networkpolicy: {
      description: "Kubernetes NetworkPolicy for network security",
      examples: [
        "https://kubernetes.io/docs/concepts/services-networking/network-policies/",
        "https://github.com/kubernetes/examples/blob/master/staging/network-policy/network-policy.yaml"
      ]
    }
  },
  argocd: {
    application: {
      description: "ArgoCD Application for GitOps deployments",
      examples: [
        "https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#applications",
        "https://github.com/argoproj/argocd-example-apps/blob/master/apps/guestbook.yaml"
      ]
    },
    project: {
      description: "ArgoCD AppProject for organizing applications",
      examples: [
        "https://argo-cd.readthedocs.io/en/stable/user-guide/projects/",
        "https://github.com/argoproj/argo-cd/blob/master/examples/appproject.yaml"
      ]
    }
  },
  datadog: {
    monitor: {
      description: "Datadog Monitor for alerting and monitoring",
      examples: [
        "https://docs.datadoghq.com/monitors/configuration/",
        "https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/monitor"
      ]
    },
    dashboard: {
      description: "Datadog Dashboard for metrics visualization",
      examples: [
        "https://docs.datadoghq.com/dashboards/",
        "https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/dashboard"
      ]
    }
  },
  docker: {
    compose: {
      description: "Docker Compose for multi-container applications",
      examples: [
        "https://docs.docker.com/compose/compose-file/",
        "https://github.com/docker/awesome-compose"
      ]
    }
  },
  other: {}
};

const inputSchema = z.object({
  type: z.enum(Object.keys(MANIFEST_EXAMPLES) as [string, ...string[]]).describe("Type of manifest to generate"),
  subtype: z.string().describe("Subtype of manifest (e.g., deployment, service, configmap, application, monitor, compose)"),
  name: z.string().describe("Name of the resource/component"),
  parameters: z.record(z.any()).describe("Specific parameters for the manifest (e.g., image, replicas, env vars, ports, etc.)")
});

const callback: ToolDefinition["callback"] = async (args, extra) => {
  const { type, subtype, name, parameters } = args as {
    type: string;
    subtype: string;
    name: string;
    parameters: Record<string, any>;
  };

  // Get example references
  const typeData = MANIFEST_EXAMPLES[type as keyof typeof MANIFEST_EXAMPLES];
  const exampleData = typeData ? (typeData as any)[subtype] : undefined;

  let exampleSection = "";
  if (exampleData) {
    exampleSection = `

Reference Examples:
${exampleData.description}
${exampleData.examples.map((url: string) => `- ${url}`).join("\n")}
`;
  }

  const prompt = `Generate a ${type} YAML manifest ${!!subtype ? "for a " : ""}${subtype} named ${name}

Parameters: ${JSON.stringify(parameters, null, 2)}${exampleSection}

Requirements:
- Valid YAML syntax
- Production-ready configuration
- Best practices (security, labels, limits)
- Include comments where helpful

Generate complete YAML manifest:`;

  try {
    const response = await extra.sendRequest(
      {
        method: "sampling/createMessage",
        params: {
          messages: [{ role: "user", content: { type: "text", text: prompt } }],
          maxTokens: 2000,
          temperature: 0.1
        }
      } as ServerRequest,
      z.object({
        model: z.string(),
        role: z.string(),
        content: z.object({
          type: z.string(),
          text: z.string()
        })
      })
    );

    return toolResponse({
      message: `Generated ${type} ${subtype} manifest for ${name}`,
      data: response.content.text,
      metadata: {
        manifestType: type,
        subtype,
        resourceName: name
      }
    });
  } catch (error: any) {
    return toolResponse({
      message: `Error generating manifest: ${error.message}`,
      metadata: {
        troubleshooting: [
          "Check that the manifest type and subtype are supported",
          "Verify the parameters are valid for the manifest type",
          "Ensure the LLM sampling service is available"
        ]
      }
    }, true);
  }
};

export const generateManifestTool: ToolDefinition = {
  title: "Generate Manifest",
  description: "Generate YAML manifests (Kubernetes, ArgoCD, Datadog, etc.) using AI sampling with reference templates and best practices.",
  inputSchema,
  callback
};
