# Platform MCP Server

A [Model Context Protocol (MCP) server](https://modelcontextprotocol.io/introduction) with tools for Kubernetes, Infrastructure as Code (IaC), interacting with our databases, and other platform-related tasks.

## Features

- **🔐 JWT Authentication**: Secure authentication using Microsoft Entra ID (Azure AD)
- **👥 Role-Based Access Control**: Fine-grained permissions based on user roles
- **Hello World**: Basic endpoint to verify server functionality
- **Kubernetes Service Restart Tool**: Restart Kubernetes services in specified environments
- **📊 Health Check Endpoints**: Public and authenticated health checks
- **🔍 Audit Logging**: All user access is logged for security auditing

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

## Authentication

This server implements **JWT-based authentication** using the [MCP Draft Authorization Spec](https://spec.modelcontextprotocol.io/specification/server/auth/). It acts as a **Resource Server** that validates JWT tokens from Microsoft Entra ID.

### Quick Setup

1. **Register App in Azure AD**: Follow [Microsoft's app registration guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
2. **Configure Environment**: Copy `.env.example` to `.env` and set:

   ```bash
   MS_ENTRA_TENANT_ID=your-tenant-id
   MS_ENTRA_CLIENT_ID=your-client-id
   ```

3. **Set Up Roles**: Configure [app roles](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-add-app-roles-in-azure-ad-apps) in Azure AD
4. **Test Setup**: `npm run test-auth`
5. **Start Server**: `npm start`

### Permission System

The server maps Azure AD roles to MCP permissions:

```json
{
  "admin": ["*"],
  "developer": ["k8s:view", "k8s:restart"],
  "viewer": ["k8s:view"]
}
```

Configure custom mappings via `AUTH_PERMISSION_MAPPING` environment variable.

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

[Tools](https://modelcontextprotocol.io/docs/concepts/tools) are registered in the [./src/tools](./src/tools) directory.

### Available Resources

[Resources & Templates](https://modelcontextprotocol.io/docs/concepts/resources) are registered in the [./src/resources](./src/resources) directory.

### Available Prompts

[Prompts](https://modelcontextprotocol.io/docs/concepts/prompts) are registered in the [./src/prompts](./src/prompts) directory.

### Debugging

To debug the server, you can use [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) which should be running at <http://127.0.0.1:6274/> if you're using the provided Docker setup.

### API Endpoints

- **`GET /health`**: Public health check (no authentication required)
- **`GET /execute/v1/health`**: Authenticated health check (requires JWT token)
- **`POST /execute/v1/sse/`**: Main MCP endpoint (requires JWT token)

### Testing Authentication

```sh
# Test public endpoint
curl http://localhost:8080/health

# Test authenticated endpoint (requires valid JWT)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8080/execute/v1/health
```

## Development

Most of the development from here out will be done in the [./src/tools](./src/tools), [./src/resources](./src/resources), and [./src/prompts](./src/prompts) directories. You can add new functionality by creating new files and functions in these directories.
