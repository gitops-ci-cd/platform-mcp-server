import { z } from "zod";
import { ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { ToolDefinition, toolResponse } from "../registry.js";

// AWS CDK construct examples with reference links
const CDK_EXAMPLES = {
  core: {
    stack: {
      description: "CDK Stack - Basic building block of CDK applications",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Stack.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript"
      ]
    },
    app: {
      description: "CDK App - Root construct that represents a CDK application",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.App.html",
        "https://docs.aws.amazon.com/cdk/v2/guide/apps.html"
      ]
    }
  },
  compute: {
    lambda: {
      description: "AWS Lambda Function with CDK best practices",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/lambda"
      ]
    },
    ecs: {
      description: "Amazon ECS Service and Task Definition",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs"
      ]
    },
    ec2: {
      description: "Amazon EC2 Instance with VPC configuration",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ec2"
      ]
    }
  },
  storage: {
    s3: {
      description: "Amazon S3 Bucket with security best practices",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/s3"
      ]
    },
    dynamodb: {
      description: "Amazon DynamoDB Table with GSI configuration",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/dynamodb"
      ]
    },
    rds: {
      description: "Amazon RDS Database with subnet groups and security",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/rds"
      ]
    }
  },
  networking: {
    vpc: {
      description: "Amazon VPC with public/private subnets and NAT gateway",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/vpc"
      ]
    },
    alb: {
      description: "Application Load Balancer with target groups",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/load-balancer"
      ]
    },
    apigateway: {
      description: "API Gateway REST API with Lambda integration",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/api-gateway"
      ]
    }
  },
  security: {
    iam: {
      description: "IAM Roles, Policies, and Users with least privilege",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/iam"
      ]
    },
    kms: {
      description: "AWS KMS Key for encryption at rest",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kms-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/kms"
      ]
    },
    secretsmanager: {
      description: "AWS Secrets Manager for storing sensitive data",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_secretsmanager-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/secrets-manager"
      ]
    }
  },
  monitoring: {
    cloudwatch: {
      description: "CloudWatch Dashboards, Alarms, and Log Groups",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/cloudwatch"
      ]
    },
    xray: {
      description: "AWS X-Ray tracing configuration",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_xray-readme.html",
        "https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs.html"
      ]
    }
  },
  pipeline: {
    codepipeline: {
      description: "AWS CodePipeline for CI/CD automation",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codepipeline-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/codepipeline"
      ]
    },
    codebuild: {
      description: "AWS CodeBuild project for building applications",
      examples: [
        "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codebuild-readme.html",
        "https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/codebuild"
      ]
    }
  }
};

const inputSchema = z.object({
  category: z.enum(Object.keys(CDK_EXAMPLES) as [string, ...string[]]).describe("CDK construct category (core, compute, storage, networking, security, monitoring, pipeline)"),
  constructType: z.string().describe("Type of construct (e.g. lambda, s3, vpc, iam, cloudwatch, codepipeline)"),
  name: z.string().describe("Name of the construct/resource"),
  parameters: z.record(z.any()).describe("Construct-specific parameters (e.g. runtime, memory, vpc config, policies, etc.)")
});

const callback: ToolDefinition["callback"] = async (args, extra) => {
  const { category, constructType, name, parameters } = args as {
    category: string;
    constructType: string;
    name: string;
    parameters: Record<string, any>;
  };

  // Get example references
  const categoryData = CDK_EXAMPLES[category as keyof typeof CDK_EXAMPLES];
  const exampleData = categoryData ? (categoryData as any)[constructType] : undefined;

  let exampleSection = "";
  if (exampleData) {
    exampleSection = `

Reference Examples:
${exampleData.description}
${exampleData.examples.map((url: string) => `- ${url}`).join("\n")}
`;
  }

  const prompt = `Generate an AWS CDK TypeScript construct for ${category}/${constructType} named ${name}

Parameters: ${JSON.stringify(parameters, null, 2)}${exampleSection}

Requirements:
- Valid TypeScript syntax with proper CDK v2 imports
- Production-ready configuration with security best practices
- Proper resource naming and tagging
- Include error handling where appropriate
- Add comments explaining key configurations
- Use CDK best practices (least privilege, encryption, etc.)
- Include proper typing and interfaces

Generate complete CDK TypeScript code:`;

  try {
    const response = await extra.sendRequest(
      {
        method: "sampling/createMessage",
        params: {
          messages: [{ role: "user", content: { type: "text", text: prompt } }],
          maxTokens: 3000,
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
      message: `Generated AWS CDK construct for ${constructType} in ${category} category`,
      metadata: {
        category: category,
        construct_type: constructType,
        construct_name: name,
        documentation: exampleData
      },
      links: {
        documentation: exampleData?.examples?.[0] || "https://docs.aws.amazon.com/cdk/",
        examples: exampleData?.examples?.[1] || "https://github.com/aws-samples/aws-cdk-examples"
      }
    });
  } catch (error: any) {
    return toolResponse({
      data: { error: error.message },
      message: `Error generating CDK construct: ${error.message}`,
      metadata: {
        category: category,
        construct_type: constructType,
        troubleshooting: [
          "Check that the category and construct type are valid",
          "Verify the parameters match the expected format",
          "Review AWS CDK documentation for correct syntax"
        ]
      }
    }, true);
  }
};

export const generateAwsCdkTool: ToolDefinition = {
  title: "Generate AWS CDK",
  description: "Generate AWS CDK TypeScript constructs with best practices, security configurations, and proper resource management.",
  inputSchema,
  callback
};
