import { PromptDefinition } from "./registry.js";

const callback: PromptDefinition["callback"] = async (_extra) => {
  return {
    messages: [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `# Kubernetes Troubleshooting Guide

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
- Consider cluster autoscaling if consistently resource-constrained`
        }
      }
    ]
  };
};

export const troubleshootingPrompt: PromptDefinition = {
  name: "k8s_troubleshooting",
  description: "Get Kubernetes troubleshooting steps for common issues",
  callback,
};
