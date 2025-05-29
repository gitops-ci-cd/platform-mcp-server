import { registerPrompt, PromptHandler } from './registry.js';

// Handler for Kubernetes best practices
const bestPracticesHandler: PromptHandler = async () => {
  return `# Kubernetes Best Practices for Production Deployments

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
- Have a **rollback plan** for failed upgrades`;
};

// Handler for Kubernetes troubleshooting
const troubleshootingHandler: PromptHandler = async () => {
  return `# Kubernetes Troubleshooting Guide

## Pod Issues
- **Pod stuck in Pending**: Check node resources, PVC availability, or node selectors
- **Pod stuck in ContainerCreating**: Check image pull issues, volume mount problems
- **CrashLoopBackOff**: Check container logs, resource limits, configuration errors
- **ImagePullBackOff**: Check image name, registry credentials, network connectivity

## Node Issues
- **NotReady status**: Check kubelet logs, node resources, network connectivity
- **High CPU/Memory**: Identify resource-intensive pods, check for memory leaks
- **Disk pressure**: Clean up unused images, increase disk size

## Networking Issues
- **Service not accessible**: Check endpoints, selectors, port configurations
- **DNS resolution failures**: Check CoreDNS/kube-dns pods, network policies
- **Ingress not working**: Check ingress controller logs, TLS configuration

## Common Commands
\`\`\`bash
# Pod diagnostics
kubectl describe pod <pod-name>
kubectl logs <pod-name> [-c container-name]
kubectl get events --sort-by='.lastTimestamp'

# Node diagnostics
kubectl describe node <node-name>
kubectl top node
kubectl top pod

# Network diagnostics
kubectl get endpoints <service-name>
kubectl run -it --rm debug --image=busybox -- sh
  # Then use wget, ping, nslookup inside the pod
\`\`\`

## Cluster Health
- Check control plane components: \`kubectl get componentstatuses\`
- Check API server logs: \`kubectl logs -n kube-system kube-apiserver-<node>\`
- Verify etcd health: \`kubectl exec -it -n kube-system etcd-<node> -- etcdctl endpoint health\`

## Performance Issues
- Use \`kubectl top\` to identify resource-intensive pods
- Check for resource limits and requests
- Look for pod evictions due to resource constraints
- Consider cluster autoscaling if consistently resource-constrained`;
};

export const bestPracticesPrompt = {
  name: 'k8s_best_practices',
  description: 'Get Kubernetes best practices for production deployments',
  handler: bestPracticesHandler
};

export const troubleshootingPrompt = {
  name: 'k8s_troubleshooting',
  description: 'Get Kubernetes troubleshooting steps for common issues',
  handler: troubleshootingHandler
};
