import { PromptDefinition } from "./registry.js";

const callback: PromptDefinition["callback"] = async (args: any, extra: any) => {
  return {
    messages: [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `# Kubernetes Best Practices for Production Deployments

## Resource Management
- **Set resource requests and limits** for all containers to ensure proper scheduling and prevent resource starvation
- Use **horizontal pod autoscaling** based on CPU/memory metrics
- Implement **pod disruption budgets** to maintain availability during voluntary disruptions

## Security
- Follow the **principle of least privilege** with RBAC
- Use **network policies** to restrict pod-to-pod communication
- **Scan container images** for vulnerabilities before deployment
- **Run containers as non-root** users
- Implement **pod security policies** or **Pod Security Standards**

## High Availability
- Deploy applications across **multiple replicas**
- Use **pod anti-affinity** to distribute replicas across nodes
- Configure **proper liveness and readiness probes**
- Implement **graceful shutdown** handling

## Monitoring and Observability
- Set up comprehensive **logging and monitoring**
- Implement **distributed tracing** for microservices
- Use **Prometheus** for metrics collection
- Configure **alerts** for critical conditions

## Configuration Management
- Use **ConfigMaps** and **Secrets** for configuration
- Implement **GitOps** workflows for deployment
- Use **Helm** or **Kustomize** for templating and managing manifests
- Keep **stateless** when possible, use managed services for stateful workloads

## Networking
- Use **service mesh** for complex microservice architectures
- Implement proper **ingress** configurations with TLS
- Configure **network policies** to restrict traffic

## Backup and Disaster Recovery
- Regularly **backup etcd**
- Implement **multi-cluster** strategies for critical workloads
- Test **disaster recovery** procedures regularly

## Upgrade Strategy
- Use **rolling updates** with proper maxSurge and maxUnavailable settings
- Test upgrades in **staging environments** before production
- Have a **rollback plan** for failed upgrades`
        }
      }
    ]
  };
};

export const bestPracticesPrompt: PromptDefinition = {
  name: "k8s_best_practices",
  description: "Get Kubernetes best practices for production deployments",
  callback,
};
