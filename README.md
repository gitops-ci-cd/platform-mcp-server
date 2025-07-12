# Platform MCP Server

A [Model Context Protocol (MCP) server](https://modelcontextprotocol.io/introduction) with tools for Kubernetes, Infrastructure as Code (IaC), interacting with our databases, and other platform-related tasks.

## Quick Start

Start the server locally using Docker:

```sh
cp .env.example .env
docker compose up -d
```

This will start the MCP server on `http://localhost:8080`.

- Check it's running by visiting [/health](http://localhost:8080/health) in your browser.
- Interact with the server directly using the [MCP Inspector](http://localhost:6274/?serverUrl=http://app:8080/execute).
- Add the server to your MCP client configuration (e.g., VS Code, Claude Desktop, Cursor) to start using it.

## Features

- **🔐 MCP SDK Authentication**: Native MCP authentication using Microsoft Entra ID (previously Azure AD)
- **👥 Role-Based Access Control**: Fine-grained permissions based on user roles
- **📦 Standards-Compliant**: Uses MCP SDK's ProxyOAuthServerProvider and requireBearerAuth
- **🔍 Audit Logging**: All user access to tools is logged for security auditing

## Usage

To configure VS Code to use this MCP server, add the following to your `settings.json`:

TODO: Update the URL once deployed to production.

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

## Development

### Authentication

This server implements **JWT-based authentication** using the **[MCP SDK's native authentication system](https://modelcontextprotocol.io/)** with Microsoft Entra ID integration. The server acts as a **Resource Server** that validates JWT tokens from Microsoft Entra ID using the MCP SDK's `ProxyOAuthServerProvider` and `requireBearerAuth` middleware.

#### Quick Setup

1. **Register App in Entra**: Follow [Microsoft's app registration guide](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
1. **Configure Environment**: Copy `.env.example` to `.env` and set:

    ```bash
    MS_ENTRA_TENANT_ID=your-tenant-id
    MS_ENTRA_CLIENT_ID=your-client-id
    ```

1. **Test Setup**: `npm run test-auth`
1. **Start Server**: `npm start`

#### Permission System

Your Entra roles should match the tool permission requirements:

- TODO
- TODO
- TODO

Configure these roles in your Entra app registration and assign them to users.

### Starting the Server locally

```sh
cp .env.example .env
docker compose watch
```

If you have node installed locally, you can use:

```sh
npm run start
```

### Adding Tools

[Tools](https://modelcontextprotocol.io/docs/concepts/tools) are registered in the [./src/tools](./src/tools) directory.

### Adding Resources

[Resources & Templates](https://modelcontextprotocol.io/docs/concepts/resources) are registered in the [./src/resources](./src/resources) directory.

### Adding Prompts

[Prompts](https://modelcontextprotocol.io/docs/concepts/prompts) are registered in the [./src/prompts](./src/prompts) directory.

### Debugging

To debug the server, you can use [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) which should be running at <http://localhost:6274/?serverUrl=http://app:8080/execute> if you're using the provided Docker setup.

## Production Deployment

When deploying to production, ensure that:

- You are using a valid JWT token from Microsoft Entra ID
- The `NODE_ENV` is set to `production`

### Environment Variables

See [`.env.example`](./.env.example) for required and recommended environment variables.
