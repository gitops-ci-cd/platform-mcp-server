import { z } from "zod";
import { ServerRequest, CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import { getArgoCDConfig, createApplication } from "../../../../lib/clients/argocd/index.js";

const inputSchema = z.object({
  name: z.string().describe("Application name"),
  repoURL: z.string().describe("Git repository URL containing the application manifests"),
  destinationNamespace: z.string().describe("Target namespace for application deployment"),
  parameters: z
    .record(z.any())
    .optional()
    .describe(
      "Specific parameters for the application (e.g., image, replicas, env vars, ports, etc.)"
    ),
});

const resultSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal("Application"),
  metadata: z
    .object({
      name: z.string(),
      namespace: z.string(),
    })
    .passthrough(),
  spec: z.union([
    // Single source
    z
      .object({
        project: z.string(),
        source: z
          .object({
            repoURL: z.string(),
            targetRevision: z.string(),
          })
          .passthrough(),
        destination: z
          .object({
            server: z.string(),
            namespace: z.string(),
          })
          .passthrough(),
      })
      .passthrough(),
    // Multiple sources
    z
      .object({
        project: z.string(),
        sources: z.array(
          z
            .object({
              repoURL: z.string(),
              targetRevision: z.string(),
            })
            .passthrough()
        ),
        destination: z
          .object({
            server: z.string(),
            namespace: z.string(),
          })
          .passthrough(),
      })
      .passthrough(),
  ]),
});
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
  const { name, repoURL, destinationNamespace, parameters } = args as {
    name: string;
    repoURL: string;
    destinationNamespace: string;
    parameters?: Record<string, any>;
  };

  try {
    // Get authenticated user for audit logging
    const user = getCurrentUser(`creating ArgoCD application: ${name}`);

    // Load ArgoCD configuration
    const argoCDConfig = getArgoCDConfig();

    // Use sampling to generate the ArgoCD application configuration
    const sample = await extra.sendRequest(
      {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `You must return a valid JSON object representing an ArgoCD Application resource.

Generate an ArgoCD application configuration for:
- Name: ${name}
- Repository URL: ${repoURL}
- Destination namespace: ${destinationNamespace}
- Parameters: ${JSON.stringify(parameters || {}, null, 2)}

Guidelines:
1. Detect if this is a Helm chart, Kustomize, or plain YAML based on the repo URL and parameters
2. Set appropriate sync policy (automated with prune and self-heal for most cases)
3. Use "default" project unless parameters specify otherwise
4. Set targetRevision to "HEAD" unless parameters specify a specific version
5. Use https://kubernetes.default.svc as destination server
6. Configure Helm values, parameters, or Kustomize settings as needed based on the parameters provided
7. Follow ArgoCD best practices for the application type

Return ONLY a valid JSON object with:
- apiVersion: argoproj.io/v1alpha1
- kind: Application
- metadata: name (${name}), namespace (argocd), labels, annotations (user: ${user.email})
- spec: complete ArgoCD application specification

Do not include any markdown, explanations, or code blocks. Return only the raw JSON object.`,
              },
            },
          ],
          maxTokens: 2048,
        },
      } as ServerRequest,
      CreateMessageWithValidatedResultSchema
    );

    // Create the application
    const response = await createApplication(sample.content.text);
    const data = await response.json();
    const message = `ArgoCD application '${name}' created successfully`;

    const argoWebUrl = argoCDConfig.endpoint.replace("/api/v1", "");
    const appWebUrl = `${argoWebUrl}/applications/${name}`;

    return toolResponse({
      message,
      data,
      links: {
        ui: appWebUrl,
        sync: `${appWebUrl}?operation=sync`,
        logs: `${appWebUrl}?view=tree&logs=true`,
        events: `${appWebUrl}?view=events`,
        docs: "https://argo-cd.readthedocs.io/en/stable/user-guide/applications/",
      },
      metadata: {
        potentialActions: [
          "Use ArgoCD UI to manually sync the application",
          "Use createArgoCDProject tool to organize applications",
          "Check application health and sync status in ArgoCD UI",
        ],
      },
    });
  } catch (error: any) {
    return toolResponse(
      {
        message: `Failed to create ArgoCD application: ${error.message}`,
        links: {
          docs: "https://argo-cd.readthedocs.io/en/stable/user-guide/applications/",
          troubleshooting:
            "https://argo-cd.readthedocs.io/en/stable/operator-manual/troubleshooting/",
        },
        metadata: {
          troubleshooting: [
            "Ensure ARGOCD_TOKEN environment variable is set with appropriate permissions",
            "Verify your token has applications create/read permissions",
            "Ensure the specified ArgoCD project exists",
            "Verify ArgoCD can access the specified Git repository",
          ],
        },
      },
      true
    );
  }
};

export const createArgoCDApplicationTool: ToolDefinition = {
  title: "Create ArgoCD Application",
  annotations: {
    openWorldHint: true,
    idempotentHint: true,
  },
  description: "Create or verify an ArgoCD application using AI to generate optimal configuration.",
  inputSchema,
  requiredPermissions: ["argocd:admin", "argocd:applications:create", "admin"],
  callback,
};
