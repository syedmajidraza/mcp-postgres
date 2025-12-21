# PostgreSQL MCP Teams Message Extension

Microsoft Teams Message Extension for querying PostgreSQL databases through the PostgreSQL MCP server.

## Features

- Execute SQL queries directly from Teams conversations
- List all database tables
- Describe table schemas
- Natural language query support (when integrated with AI)
- Adaptive Cards for rich result display
- OAuth 2.0 authentication

## Prerequisites

1. **Azure Account**: Active Azure subscription
2. **Bot Framework**: Registered bot in Azure Bot Service
3. **PostgreSQL MCP Server**: Running instance of the MCP server
4. **Node.js**: Version 18 or higher
5. **Teams Developer Account**: For testing and deployment

## Setup Instructions

### 1. Register Azure Bot

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Azure Bot** resource
3. Configure the messaging endpoint: `https://your-domain.com/api/messages`
4. Note down the **App ID** and generate a new **Client Secret**

### 2. Configure Azure AD Authentication

1. Register an Azure AD application
2. Configure API permissions for Microsoft Graph (if needed)
3. Add redirect URIs for OAuth
4. Create client secret

### 3. Install Dependencies

```bash
cd teams-message-extension
npm install
```

### 4. Configure Environment Variables

Copy [.env.example](.env.example) to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
BOT_ID=YOUR_BOT_ID_GUID
BOT_PASSWORD=YOUR_BOT_PASSWORD
MCP_SERVER_URL=http://localhost:3000
PORT=3978
AZURE_AD_CLIENT_ID=YOUR_AAD_CLIENT_ID
AZURE_AD_CLIENT_SECRET=YOUR_AAD_CLIENT_SECRET
AZURE_AD_TENANT_ID=YOUR_TENANT_ID
```

### 5. Update Teams App Manifest

Edit [manifest/manifest.json](manifest/manifest.json):

1. Replace `YOUR_APP_ID_GUID` with a new GUID (generate at https://guidgenerator.com)
2. Replace `YOUR_BOT_ID_GUID` with your Azure Bot App ID
3. Replace `YOUR_AAD_APP_ID_GUID` with your Azure AD App ID
4. Update `validDomains` with your actual domain
5. Update URLs for website, privacy, and terms

### 6. Build and Run

Development mode with auto-reload:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

### 7. Test Locally with ngrok

For local testing, use ngrok to expose your bot:

```bash
ngrok http 3978
```

Update your Azure Bot messaging endpoint with the ngrok URL:
```
https://YOUR_NGROK_URL.ngrok.io/api/messages
```

### 8. Deploy to Teams

1. Package the manifest:
   ```bash
   cd manifest
   zip -r postgres-mcp-teams.zip manifest.json color.png outline.png
   ```

2. Upload to Teams:
   - Open Microsoft Teams
   - Go to Apps → Manage your apps
   - Click "Upload a custom app"
   - Select the zip file

## Usage in Teams

### Query Database

1. Type `@PostgreSQL MCP` in any chat or channel
2. Select "Query Database"
3. Enter your SQL query or natural language question
4. Results appear as an Adaptive Card

### List Tables

1. Type `@PostgreSQL MCP`
2. Select "List Tables"
3. All database tables display in a card

### Describe Table

1. Type `@PostgreSQL MCP`
2. Select "Describe Table"
3. Enter table name
4. Schema information displays in a card

## Architecture

```
Microsoft Teams
    ↓ (Bot Framework)
Azure Bot Service
    ↓ (HTTPS webhook)
Teams Message Extension (This app)
    ↓ (HTTP API)
PostgreSQL MCP Server
    ↓ (SQL)
PostgreSQL Database
```

## Security Considerations

- Never expose database credentials in Teams
- Use Azure AD authentication for postgres (recommended)
- Implement row-level security based on Teams user
- Audit all queries with user tracking
- Use Azure Key Vault for secrets
- Enable TLS for all communications

## Deployment Options

### Option 1: Azure App Service

```bash
az webapp up --name postgres-mcp-teams --resource-group YOUR_RG
```

### Option 2: Azure Container Instances

```bash
docker build -t postgres-mcp-teams .
docker push YOUR_REGISTRY/postgres-mcp-teams:latest
az container create --resource-group YOUR_RG --name postgres-mcp-teams --image YOUR_REGISTRY/postgres-mcp-teams:latest
```

### Option 3: Azure Functions

Convert to serverless using Azure Functions runtime.

## Troubleshooting

### Bot not responding
- Check Azure Bot messaging endpoint is correct
- Verify BOT_ID and BOT_PASSWORD in .env
- Check bot service logs in Azure Portal

### Database connection errors
- Ensure MCP server is running and accessible
- Verify MCP_SERVER_URL in .env
- Check firewall rules allow connection

### OAuth issues
- Verify Azure AD app configuration
- Check redirect URIs are correct
- Ensure client secret hasn't expired

## Development

Run tests:
```bash
npm test
```

Lint code:
```bash
npm run lint
```

Watch mode:
```bash
npm run watch
```

## Related Projects

- [PostgreSQL MCP Server](../mcp-server/README.md)
- [PostgreSQL MCP VSCode Extension](../vscode-extension/README.md)

## License

MIT

## Support

For issues and questions:
- Create an issue at: https://github.com/anthropics/claude-code/issues
- Review implementation plan: [TEAMS_INTEGRATION_PLAN.md](../TEAMS_INTEGRATION_PLAN.md)
