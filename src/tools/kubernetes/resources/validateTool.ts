import { z } from "zod";
import { ServerRequest } from "@modelcontextprotocol/sdk/types.js";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getResource, getResourceEvents, KubernetesError, SUPPORTED_RESOURCE_KINDS } from "../../../clients/kubernetes/index.js";

const inputSchema = z.object({
  kind: z.enum(SUPPORTED_RESOURCE_KINDS).describe("Kubernetes resource kind to analyze"),
  name: z.string().describe("Name of the resource to analyze"),
  namespace: z.string().optional().describe("Namespace (optional for cluster-scoped resources)"),
  analysisType: z.enum(["security", "performance", "reliability", "cost", "comprehensive"])
    .default("comprehensive")
    .describe("Type of analysis to perform"),
  includeEvents: z.boolean().default(true).describe("Include related events in the analysis for additional context")
});

const outputSchema = z.object({
  metadata: z.object({
    kind: z.string().describe("Resource kind that was analyzed"),
    name: z.string().describe("Resource name that was analyzed"),
    namespace: z.string().describe("Namespace of the resource"),
    analysisType: z.enum(["security", "performance", "reliability", "cost", "comprehensive"]).describe("Type of analysis performed"),
    timestamp: z.string().describe("ISO timestamp when analysis was performed")
  }).optional().describe("Analysis metadata"),
  analysis: z.string().optional().describe("LLM-generated analysis with findings and recommendations"),
  rawData: z.object({
    resource: z.any().describe("Raw Kubernetes resource data"),
    events: z.array(z.any()).optional().describe("Related Kubernetes events if requested")
  }).optional().describe("Raw resource and event data used for analysis"),
  error: z.string().optional().describe("Error message (only present on failure)"),
  statusCode: z.number().optional().describe("HTTP status code for the error (only present on failure)")
});

const callback: ToolDefinition["callback"] = async (args, extra) => {
  const { kind, name, namespace, analysisType, includeEvents } = args as {
    kind: typeof SUPPORTED_RESOURCE_KINDS[number];
    name: string;
    namespace?: string;
    analysisType: "security" | "performance" | "reliability" | "cost" | "comprehensive";
    includeEvents: boolean;
  };

  try {
    // Get the resource data
    const resource = await getResource(kind, name, namespace);

    // Optionally get events for additional context
    let events: any[] = [];
    if (includeEvents) {
      try {
        events = await getResourceEvents(kind, name, namespace);
      } catch {
        // If events fail, continue without them
      }
    }

    // Build the analysis prompt based on the type requested
    const analysisPrompts = {
      security: `Analyze this Kubernetes ${kind} resource for security issues:
- Check for privilege escalation risks (privileged containers, host access)
- Review resource limits and security contexts
- Identify potential vulnerabilities in configuration
- Assess network exposure and access controls
- Check for secrets management best practices`,

      performance: `Analyze this Kubernetes ${kind} resource for performance optimization:
- Review resource requests and limits
- Check for anti-patterns that could impact performance
- Assess scaling configuration
- Identify potential bottlenecks
- Suggest performance improvements`,

      reliability: `Analyze this Kubernetes ${kind} resource for reliability and resilience:
- Check for high availability configuration
- Review health checks and probes
- Assess failure recovery mechanisms
- Identify single points of failure
- Suggest reliability improvements`,

      cost: `Analyze this Kubernetes ${kind} resource for cost optimization:
- Review resource allocation efficiency
- Check for over-provisioning or under-utilization
- Assess scaling policies
- Identify cost optimization opportunities
- Suggest resource right-sizing`,

      comprehensive: `Perform a comprehensive analysis of this Kubernetes ${kind} resource covering:
- Security posture and potential vulnerabilities
- Performance optimization opportunities
- Reliability and resilience patterns
- Cost optimization potential
- Best practices compliance
- Overall operational health`
    };

    const basePrompt = analysisPrompts[analysisType];

    const fullPrompt = `${basePrompt}

**Resource Data:**
\`\`\`json
${JSON.stringify(resource, null, 2)}
\`\`\`

${includeEvents && events.length > 0 ? `
**Recent Events:**
\`\`\`json
${JSON.stringify(events, null, 2)}
\`\`\`
` : ""}

Please provide:
1. **Summary**: Brief overview of findings
2. **Issues Found**: List specific problems with severity levels (Critical/High/Medium/Low)
3. **Recommendations**: Actionable steps to address issues
4. **Best Practices**: Additional suggestions for improvement
5. **Risk Assessment**: Overall risk level and priority

Format your response in a structured way that's easy for both humans and AI agents to parse.`;

    let analysisResult = "LLM analysis is not available in this environment.";

    try {
      // Use MCP sampling to get LLM analysis
      const response = await extra.sendRequest(
        {
          method: "sampling/createMessage",
          params: {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: fullPrompt
                }
              }
            ],
            maxTokens: 2000,
            temperature: 0.1, // Low temperature for consistent analysis
            topP: 0.9
          }
        } as ServerRequest,
        z.object({
          model: z.string(),
          stopReason: z.string().optional(),
          role: z.string(),
          content: z.object({
            type: z.string(),
            text: z.string()
          })
        })
      );

      analysisResult = response.content.text;
    } catch (error: any) {
      console.error("Error in LLM analysis:", error.message);
      analysisResult = `Analysis failed: ${error.message}`;
    }

    return toolResponse({
      data: {
        resource,
        events: includeEvents ? events : undefined,
        analysis: analysisResult
      },
      message: `Analysis complete for ${kind}/${name}${namespace ? ` in namespace ${namespace}` : ""}`,
      metadata: {
        kind,
        name,
        namespace: namespace || "default",
        analysis_type: analysisType,
        timestamp: new Date().toISOString(),
        events_included: includeEvents && events.length > 0
      }
    });

  } catch (error) {
    const k8sError = error as KubernetesError;
    const errorMessage = k8sError.statusCode === 404
      ? `Resource ${kind}/${name} not found${namespace ? ` in namespace ${namespace}` : ""}`
      : `Failed to analyze ${kind}/${name}: ${k8sError.message}`;

    return toolResponse({
      data: { error: errorMessage, statusCode: k8sError.statusCode },
      message: errorMessage,
      metadata: {
        kind,
        name,
        namespace: namespace || "default",
        status_code: k8sError.statusCode,
        troubleshooting: [
          "Check that the resource exists and is accessible",
          "Verify you have proper RBAC permissions",
          "Ensure the resource kind is supported",
          "Confirm the namespace is correct (if applicable)"
        ]
      }
    }, true);
  }
};

export const validateKubernetesResourceTool: ToolDefinition = {
  title: "Validate Kubernetes Resource",
  description: "Analyze a Kubernetes resource using AI to identify security, performance, reliability, and cost optimization opportunities. Provides detailed recommendations and best practices.",
  inputSchema,
  outputSchema,
  requiredPermissions: ["k8s:view", "admin"],
  callback
};
