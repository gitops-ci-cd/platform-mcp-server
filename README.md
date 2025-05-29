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
    "platform-mcp-server": {
      "url": "http://localhost:8080/execute/v1/sse/",
      "transportType": "sse",
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
npm run start
```

### Available Tools

[Tools](https://modelcontextprotocol.io/docs/concepts/tools) are registered in the <./src/tools> directory.

### Available Resources

[Resources & Templates](https://modelcontextprotocol.io/docs/concepts/resources) are registered in the <./src/resources> directory.

### Available Prompts

[Prompts](https://modelcontextprotocol.io/docs/concepts/prompts) are registered in the <./src/prompts> directory.

### Debugging

To debug the server, you can use [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) which should be running at <http://127.0.0.1:6274/> if you're using the provided Docker setup.

## Development

Most of the development from here out will be done in the <./src/tools>, <./src/resources>, and <./src/prompts> directories. You can add new functionality by creating new files and functions in these directories.
