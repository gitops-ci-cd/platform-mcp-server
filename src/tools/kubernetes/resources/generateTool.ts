import { z } from "zod";
import { ServerRequest, CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";

import { ToolDefinition, toolResponse } from "../../registry.js";

// Example mappings with reference links
const MANIFEST_EXAMPLES = {
  deployment: {
    description: "Kubernetes Deployment for running stateless applications",
    examples: [
      "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
      "https://github.com/kubernetes/examples/blob/master/staging/deployment/deployment.yaml",
    ],
  },
  service: {
    description: "Kubernetes Service for exposing applications",
    examples: [
      "https://kubernetes.io/docs/concepts/services-networking/service/",
      "https://github.com/kubernetes/examples/blob/master/staging/service/frontend-service.yaml",
    ],
  },
  namespace: {
    description: "Kubernetes Namespace for resource isolation",
    examples: [
      "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/",
      "https://github.com/kubernetes/examples/blob/master/staging/namespace/namespace.yaml",
    ],
  },
  configmap: {
    description: "Kubernetes ConfigMap for configuration data",
    examples: [
      "https://kubernetes.io/docs/concepts/configuration/configmap/",
      "https://github.com/kubernetes/examples/blob/master/staging/configmap/configmap.yaml",
    ],
  },
  externalSecret: {
    description: "Kubernetes operator that integrates with Vault",
    examples: [
      "https://external-secrets.io/latest/api/externalsecret/",
      "https://external-secrets.io/latest/provider/hashicorp-vault/",
    ],
  },
  ingress: {
    description: "Kubernetes Ingress for HTTP/HTTPS routing",
    examples: [
      "https://kubernetes.io/docs/concepts/services-networking/ingress/",
      "https://github.com/kubernetes/examples/blob/master/staging/ingress/ingress.yaml",
    ],
  },
  networkpolicy: {
    description: "Kubernetes NetworkPolicy for network security",
    examples: [
      "https://kubernetes.io/docs/concepts/services-networking/network-policies/",
      "https://github.com/kubernetes/examples/blob/master/staging/network-policy/network-policy.yaml",
    ],
  },
};

const inputSchema = z.object({
  kind: z.string().describe("Kind of manifest to generate"),
  name: z.string().describe("Name of the resource"),
  namespace: z.string().optional().default("default").describe("Namespace for the resource"),
  parameters: z
    .record(z.any())
    .describe(
      "Specific parameters for the manifest (e.g., image, replicas, env vars, ports, etc.)"
    ),
});

const resultSchema = z
  .object({
    apiVersion: z.string(),
    kind: z.string(),
    metadata: z
      .object({
        name: z.string(),
        namespace: z.string().optional(),
      })
      .passthrough(),
    spec: z.any(), // Allow any spec structure since different kinds have different specs
  })
  .passthrough(); // Allow additional fields like status, etc.
const CreateMessageWithValidatedResultSchema = CreateMessageResultSchema.extend({
  content: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("text"),
      text: z.preprocess((val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val; // Let validation fail naturally
          }
        }
        return val;
      }, resultSchema),
      annotations: z.any().optional(),
    }),
  ]),
});

const callback: ToolDefinition["callback"] = async (args, extra) => {
  const { kind, name, parameters, namespace } = args as {
    kind: string;
    namespace: string;
    name: string;
    parameters: Record<string, any>;
  };

  // Get example references
  const kindData = MANIFEST_EXAMPLES[kind as keyof typeof MANIFEST_EXAMPLES];
  const exampleData = kindData ? (kindData as any)[kind] : undefined;

  let exampleSection = "";
  if (exampleData) {
    exampleSection = `

Reference Examples:
${exampleData.description}
${exampleData.examples.map((url: string) => `- ${url}`).join("\n")}
`;
  }

  const prompt = `Generate a ${kind} Kubernetes manifest named ${name} in namespace ${namespace}

Parameters: ${JSON.stringify(parameters, null, 2)}${exampleSection}

Requirements:
- Return as valid JSON (not YAML)
- Production-ready configuration
- Best practices (security, labels, limits)
- Leave out any default values
- No markdown formatting or code fences

Return the manifest as a raw JSON object.`;

  try {
    const response = await extra.sendRequest(
      {
        method: "sampling/createMessage",
        params: {
          messages: [{ role: "user", content: { type: "text", text: prompt } }],
          maxTokens: 2000,
          temperature: 0.1,
        },
      } as ServerRequest,
      CreateMessageWithValidatedResultSchema
    );

    return toolResponse({
      message: `Generated ${kind} manifest for ${name}`,
      data: response.content.text,
      links: {
        docs: exampleData?.examples?.[0] || "https://kubernetes.io/docs/",
        examples: exampleData?.examples?.[1] || "https://github.com/kubernetes/examples",
      },
      metadata: {
        kind,
        name,
      },
    });
  } catch (error: any) {
    return toolResponse(
      {
        message: `Error generating manifest: ${error.message}`,
        links: {
          docs: "https://kubernetes.io/docs/",
          troubleshooting: "https://kubernetes.io/docs/troubleshooting/",
        },
        metadata: {
          troubleshooting: [
            "Check that the manifest kind is supported",
            "Verify the parameters are valid for the manifest kind",
            "Ensure the LLM sampling service is available",
          ],
        },
      },
      true
    );
  }
};

export const generateKubernetesManifestTool: ToolDefinition = {
  title: "Generate Kubernetes Manifest",
  annotations: {
    openWorldHint: true,
  },
  description:
    "Generate Kubernetes resource manifest using AI sampling with reference templates and best practices.",
  inputSchema,
  requiredPermissions: [],
  callback,
};
