import { PromptDefinition } from "./registry.js";
import { z } from "zod";

const callback: PromptDefinition["callback"] = async (args: any, _extra: any) => {
  // When argsSchema is provided, args is the first parameter
  const category = args?.category || "all";

  let content = "# Kubernetes Troubleshooting Guide\n\n";

  if (category === "pod" || category === "all") {
    content += `
## Pod Issues
- **Pod stuck in Pending**: Check node resources, PVC availability, or node selectors
- **Pod stuck in ContainerCreating**: Check image pull issues, volume mount problems
- **CrashLoopBackOff**: Check container logs, resource limits, configuration errors
- **ImagePullBackOff**: Check image name, registry credentials, network connectivity

### Pod Diagnostic Commands
\`\`\`bash
kubectl describe pod <pod-name>
kubectl logs <pod-name> [-c container-name]
kubectl get events --sort-by='.lastTimestamp' --field-selector involvedObject.name=<pod-name>
kubectl exec -it <pod-name> -- sh  # Debug running pod
\`\`\``;
  }

  if (category === "node" || category === "all") {
    content += `
## Node Issues
- **NotReady status**: Check kubelet logs, node resources, network connectivity
- **High CPU/Memory**: Identify resource-intensive pods, check for memory leaks
- **Disk pressure**: Clean up unused images, increase disk size
- **Taints and tolerations**: Check if pods can be scheduled on nodes

### Node Diagnostic Commands
\`\`\`bash
kubectl describe node <node-name>
kubectl top node
kubectl top pod --all-namespaces
kubectl get nodes -o wide
\`\`\``;
  }

  if (category === "networking" || category === "all") {
    content += `
## Networking Issues
- **Service not accessible**: Check endpoints, selectors, port configurations
- **DNS resolution failures**: Check CoreDNS/kube-dns pods, network policies
- **Ingress not working**: Check ingress controller logs, TLS configuration
- **Cross-namespace communication**: Check network policies, service mesh configuration

### Network Diagnostic Commands
\`\`\`bash
kubectl get endpoints <service-name>
kubectl get svc
kubectl run -it --rm debug --image=busybox -- sh
  # Then use: wget, ping, nslookup, telnet inside the pod
kubectl get networkpolicies
\`\`\``;
  }

  if (category === "all") {
    content += `
## Cluster Health
- Check control plane components: \`kubectl get componentstatuses\`
- Check API server logs: \`kubectl logs -n kube-system kube-apiserver-<node>\`
- Verify etcd health: \`kubectl exec -it -n kube-system etcd-<node> -- etcdctl endpoint health\`

## Performance Issues
- Use \`kubectl top\` to identify resource-intensive pods
- Check for resource limits and requests
- Look for pod evictions due to resource constraints
- Consider cluster autoscaling if consistently resource-constrained`;
  }

  return {
    messages: [
      {
        role: "assistant",
        content: {
          type: "text",
          text: content
        }
      }
    ]
  };
};

export const troubleshootingPrompt: PromptDefinition = {
  name: "k8s_troubleshooting",
  description: "Get Kubernetes troubleshooting steps for common issues",
  argsSchema: z.object({
    category: z.enum(["pod", "node", "networking", "all"]).optional().describe("The type of troubleshooting guide to show")
  }),
  callback,
};
