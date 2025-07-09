import { z } from "zod";
import { ServerRequest } from "@modelcontextprotocol/sdk/types.js";

import { ToolDefinition, toolResponse } from "../registry.js";

// Map common provider names to their registry paths
const PROVIDER_MAP: Record<string, string> = {
  aws: "hashicorp/aws",
  azure: "hashicorp/azurerm",
  gcp: "hashicorp/google",
  kubernetes: "hashicorp/kubernetes",
  helm: "hashicorp/helm",
  datadog: "DataDog/datadog",
  vault: "hashicorp/vault",
  github: "integrations/github",
  artifactory: "jfrog/artifactory",
  other: "",
};

// Helper function to generate Terraform registry URLs
const getTerraformDocLinks = (provider: string, resourceType: string, resourceCategory: "resources" | "data-sources" = "resources") => {
  const baseUrl = "https://registry.terraform.io/providers";

  const providerPath = PROVIDER_MAP[provider] || provider;
  const providerUrl = `${baseUrl}/${providerPath}/latest/docs`;
  const resourceUrl = `${providerUrl}/${resourceCategory}/${resourceType}`;

  return {
    provider: providerUrl,
    resource: resourceUrl
  };
};

const inputSchema = z.object({
  provider: z.enum(Object.keys(PROVIDER_MAP) as [string, ...string[]]).describe("The terraform provider to use (e.g., 'aws', 'vault', 'datadog')."),
  resourceType: z.string().describe("The type of resource to generate (e.g., 'instance', 'bucket')."),
  name: z.string().describe("The name of the resource to generate (e.g., 'my_instance', 'my_bucket')."),
  parameters: z.record(z.any()).optional().describe("Parameters for the resource, including configuration options and settings."),
  resourceCategory: z.enum(["resources", "data-sources"]).optional().describe("The category of the resource, building infrastructure or querying existing.").default("resources"),
});

const callback: ToolDefinition["callback"] = async (args, extra) => {
  const { provider, resourceType, name, parameters, resourceCategory = "resources" } = args as {
    provider: string;
    resourceType: string;
    name: string;
    parameters: Record<string, any>;
    resourceCategory?: "resources" | "data-sources";
  };

  const docLinks = getTerraformDocLinks(provider, resourceType, resourceCategory);
  const fullResourceType = `${provider}_${resourceType}`;

  const exampleSection = `

Reference Documentation:
- Provider: ${docLinks.provider}
- Resource: ${docLinks.resource}
`;

  const prompt = `Generate Terraform configuration for: ${fullResourceType}

Name: ${name}
Parameters: ${JSON.stringify(parameters, null, 2)}${exampleSection}

Requirements:
- Valid HCL syntax following Terraform best practices
- Use the correct provider and resource syntax
- Include appropriate variables, locals, and outputs
- Add meaningful comments and documentation
- Follow naming conventions (snake_case)
- Include proper resource dependencies
- Production-ready configuration with security considerations

Generate complete Terraform configuration:`;

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
      data: response.content.text,
      message: `Generated Terraform configuration for ${fullResourceType} resource named "${name}"`,
      metadata: {
        provider: provider,
        resource_type: fullResourceType,
        category: resourceCategory,
        documentation: docLinks
      },
      links: {
        resource_docs: docLinks.resource,
        provider_docs: docLinks.provider
      }
    });
  } catch (error: any) {
    return toolResponse({
      message: `Error generating Terraform configuration: ${error.message}`,
      links: {
        docs: "https://registry.terraform.io/",
        troubleshooting: "https://developer.hashicorp.com/terraform/troubleshooting"
      },
      metadata: {
        provider: provider,
        resource_type: fullResourceType,
        troubleshooting: [
          "Check that the provider and resource type are valid",
          "Verify the parameters match the expected schema",
          "Review Terraform documentation for correct syntax"
        ]
      }
    }, true);
  }
};

export const generateTerraformTool: ToolDefinition = {
  title: "Generate Terraform",
  annotations: {
    openWorldHint: true,
  },
  description: "Generate Terraform configurations for various cloud resources and services using AI sampling with best practices and examples.",
  inputSchema,
  callback
};
