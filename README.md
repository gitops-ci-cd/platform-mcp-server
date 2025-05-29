# Platform MCP Server

A [Model Context Protocol (MCP) server](https://modelcontextprotocol.io/introduction) with tools for Kubernetes, Infrastructure as Code (IaC), interacting with our databases, and other platform-related tasks.

## Features

- **Hello World**: Basic endpoint to verify server functionality
- **Kubernetes Service Restart Tool**: Restart Kubernetes services in specified environments

## Installation

1. Clone the repository
2. Install dependencies:

    ```sh
    npm install
    ```

3. Build the project:

    ```sh
    npm run build
    ```

## Configuration

To add this MCP server to your MCP settings, add the following configuration to your MCP settings file:

```json
{
  "mcpServers": {
    "platform-mcp": {
      "command": "node",
      "args": ["/path/to/platform-mcp-server/dist/index.js"],
      "env": {
        "KUBECONFIG": "/path/to/.kube/config"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Usage

### Starting the Server

```sh
docker compose watch
```

If you have node installed locally, you can use:

```sh
npm run dev
```

### Available Tools

Tools are registered in the <./src/tools> directory. Each tool is registered via <./src/tools/index.ts>. See the helloWorldTool as an example.

### Debugging

To debug the server, you can use [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) which should be running at <http://127.0.0.1:6274/> if you're using the provided Docker setup.

## Development

To add new tools, create a new file in the `src/tools` directory and export it in `src/tools/index.ts`. Then update the `setupToolHandlers` method in `src/index.ts` to include the new tool.
