# Platform MCP Server

A [Model Context Protocol (MCP) server](https://modelcontextprotocol.io/introduction) with tools for Kubernetes, Infrastructure as Code (IaC), interacting with our databases, and other platform-related tasks.

## Features

- **🔐 MCP SDK Authentication**: Native MCP authentication using Microsoft Entra ID (Azure AD)
- **👥 Role-Based Access Control**: Fine-grained permissions based on user roles
- **📦 Standards-Compliant**: Uses MCP SDK's ProxyOAuthServerProvider and requireBearerAuth
- **Hello World**: Basic endpoint to verify server functionality
- **Kubernetes Service Restart Tool**: Restart Kubernetes services in specified environments
- **📊 Health Check Endpoints**: Public and authenticated health checks
- **🔍 Audit Logging**: All user access is logged for security auditing

## Installation

1. Clone the repository
1. Install dependencies:

    ```sh
    npm install
    ```

1. Build the project:

    ```sh
    npm run build
    ```

## Configuration

To configure VS Code to use this MCP server, add the following to your `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "platform-mcp-server": {
        "url": "http://localhost:8080/execute",
        "type": "http",
      }
    }
  }
}
```

## Authentication

This server implements **JWT-based authentication** using the **[MCP SDK's native authentication system](https://modelcontextprotocol.io/)** with Microsoft Entra ID integration. The server acts as a **Resource Server** that validates JWT tokens from Microsoft Entra ID using the MCP SDK's `ProxyOAuthServerProvider` and `requireBearerAuth` middleware.

### Quick Setup

1. **Register App in Azure AD**: Follow [Microsoft's app registration guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
1. **Configure Environment**: Copy `.env.example` to `.env` and set:

   ```bash
   MS_ENTRA_TENANT_ID=your-tenant-id
   MS_ENTRA_CLIENT_ID=your-client-id
   ```

1. **Test Setup**: `npm run test-auth`
1. **Start Server**: `npm start`

### Permission System

Your Azure AD roles should match the tool permission requirements:

- **`admin`** - Access to all tools (wildcard permission)
- **`k8s:view`** - Read-only Kubernetes access
- **`k8s:restart`** - Can restart services
- **`k8s:admin`** - Full cluster management

Configure these roles in your Azure AD app registration and assign them to users.

## Usage

### Starting the Server

```sh
cp .env.example .env
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

To debug the server, you can use [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) which should be running at <http://localhost:6274/?serverUrl=http://app:8080/execute> if you're using the provided Docker setup.

## Development

Most of the development from here out will be done in the [./src/tools](./src/tools), [./src/resources](./src/resources), and [./src/prompts](./src/prompts) directories. You can add new functionality by creating new files and functions in these directories.

### Local Development (No Auth)

For local testing without authentication:

```sh
NODE_ENV=development npm run dev
```

This bypasses all authentication and uses a mock user with full permissions. Perfect for development and testing!

### Production Deployment

When deploying to production, ensure that:

- You are using a valid JWT token from Microsoft Entra ID
- The `NODE_ENV` is set to `production`
- All environment variables are correctly configured
