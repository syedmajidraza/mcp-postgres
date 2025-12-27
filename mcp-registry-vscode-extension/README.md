# MCP Registry Manager - VS Code Extension

A VS Code extension that integrates with your internal MCP Registry, allowing developers to browse, download, install, and manage MCP servers directly from VS Code.

## Features

### 1. Browse Available MCP Servers
- View all servers from your internal registry
- Search servers by name, tags, or description
- View server details (version, author, downloads, etc.)

### 2. One-Click Installation
- Download and install MCP servers with a single click
- Automatic dependency installation (Python/Node.js)
- Auto-configuration for your preferred MCP client

### 3. Server Management
- **Start/Stop/Restart** MCP servers
- View server logs in real-time
- Configure server environment variables
- Uninstall servers

### 4. MCP Client Integration
Supports automatic configuration for:
- Claude Desktop
- Cline (VS Code extension)
- Continue (VS Code extension)
- Cursor
- Zed Editor

## Installation

### From Source

```bash
cd /Users/syedraza/postgres-mcp/mcp-registry-vscode-extension
npm install
npm run compile
```

### Install in VS Code

1. Open VS Code
2. Press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
3. Run "Extensions: Install from VSIX..."
4. Select the generated `.vsix` file

## Usage

### Setup

1. Open VS Code settings (`Cmd+,`)
2. Search for "MCP Registry"
3. Set your registry URL (default: `http://localhost:8000`)

### Browse & Install Servers

1. Click the **MCP Registry** icon in the Activity Bar (sidebar)
2. Browse **Available Servers** from your registry
3. Click the download icon to install a server
4. The extension will:
   - Download the package
   - Extract to `~/.mcp-servers/`
   - Install dependencies
   - Configure your MCP client

### Manage Installed Servers

View all installed servers in the **Installed Servers** panel.

For each server, you can:
- ▶️ **Start**: Click play icon
- ⏹️ **Stop**: Click stop icon
- 🔄 **Restart**: Right-click → Restart
- ⚙️ **Configure**: Click settings icon
- 📋 **View Logs**: Right-click → View Logs
- 🗑️ **Uninstall**: Right-click → Uninstall

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                         │
│                                                               │
│  ┌─────────────────┐         ┌──────────────────┐           │
│  │  Sidebar Views  │         │  Server Manager  │           │
│  │                 │         │                  │           │
│  │  - Available    │◄────────┤  - Install       │           │
│  │  - Installed    │         │  - Start/Stop    │           │
│  │  - Search       │         │  - Configure     │           │
│  └─────────────────┘         │  - Logs          │           │
│                               └──────────────────┘           │
│          │                             │                     │
│          ▼                             ▼                     │
│  ┌─────────────────┐         ┌──────────────────┐           │
│  │ Registry Client │         │  Process Manager │           │
│  │ (HTTP API)      │         │  (child_process) │           │
│  └─────────────────┘         └──────────────────┘           │
└─────────────────────────────────────────────────────────────┘
          │                              │
          │ HTTP                         │ spawn/kill
          ▼                              ▼
┌─────────────────────┐        ┌──────────────────┐
│  MCP Registry       │        │  MCP Servers     │
│  (Backend API)      │        │  (Processes)     │
│  localhost:8000     │        │  ~/.mcp-servers/ │
└─────────────────────┘        └──────────────────┘
```

## File Structure

```
mcp-registry-vscode-extension/
├── package.json                 # Extension manifest
├── tsconfig.json               # TypeScript config
├── src/
│   ├── extension.ts            # Main entry point
│   ├── registryClient.ts       # API client for registry
│   ├── mcpServerManager.ts     # Server lifecycle management
│   ├── providers/
│   │   ├── availableServersProvider.ts    # Tree view for registry
│   │   └── installedServersProvider.ts    # Tree view for installed
│   └── types.ts                # Type definitions
└── README.md
```

## Commands

Available commands (press `Cmd+Shift+P`):

- `MCP Registry: Refresh Servers` - Refresh server lists
- `MCP Registry: Search Servers` - Search for servers
- `MCP Registry: Install MCP Server` - Install a server
- `MCP Registry: Start MCP Server` - Start a server
- `MCP Registry: Stop MCP Server` - Stop a server
- `MCP Registry: Restart MCP Server` - Restart a server
- `MCP Registry: View MCP Server Logs` - View server logs
- `MCP Registry: Configure MCP Server` - Configure environment
- `MCP Registry: Uninstall MCP Server` - Remove a server
- `MCP Registry: Set Registry URL` - Change registry URL

## Configuration

```json
{
  // Registry URL
  "mcpRegistry.registryUrl": "http://localhost:8000",

  // Install directory
  "mcpRegistry.installDirectory": "~/.mcp-servers",

  // Auto-start servers on VS Code startup
  "mcpRegistry.autoStart": false,

  // Default MCP client for auto-configuration
  "mcpRegistry.defaultMcpClient": "claude-desktop",

  // Python path
  "mcpRegistry.pythonPath": "python3",

  // Node.js path
  "mcpRegistry.nodePath": "node"
}
```

## Implementation Details

### RegistryClient (`src/registryClient.ts`)

Handles all HTTP communication with the MCP registry:

```typescript
class RegistryClient {
    async listServers(): Promise<Server[]>
    async searchServers(query: string): Promise<Server[]>
    async getServerDetails(name: string, version: string): Promise<Server>
    async downloadServer(name: string, version: string): Promise<Buffer>
}
```

### MCPServerManager (`src/mcpServerManager.ts`)

Manages MCP server lifecycle:

```typescript
class MCPServerManager {
    async installServer(server: Server): Promise<void>
    async startServer(name: string): Promise<void>
    async stopServer(name: string): Promise<void>
    async restartServer(name: string): Promise<void>
    async uninstallServer(name: string): Promise<void>
    getServerLogs(name: string): string
    async configureServer(name: string): Promise<void>
}
```

**Features:**
- Downloads `.tar.gz` from registry
- Extracts to `~/.mcp-servers/{name}/`
- Detects Python/Node.js and runs install
- Spawns server process with `child_process`
- Captures stdout/stderr for logs
- Updates MCP client config files

### Tree Data Providers

**AvailableServersProvider:**
- Fetches servers from registry API
- Shows server name, version, and download count
- Provides context menu for installation

**InstalledServersProvider:**
- Scans `~/.mcp-servers/` directory
- Checks process status (running/stopped)
- Shows different icons based on status
- Provides start/stop/restart actions

## Example Workflow

### Installing PostgreSQL MCP Server

1. User clicks MCP Registry icon
2. Extension calls `GET http://localhost:8000/api/v1/servers`
3. Shows list in "Available Servers" panel
4. User clicks download icon on "postgres-mcp@1.0.0"
5. Extension executes:
   ```typescript
   await registryClient.downloadServer('postgres-mcp', '1.0.0')
   // Downloads to /tmp/postgres-mcp-1.0.0.tar.gz

   await extract('/tmp/postgres-mcp-1.0.0.tar.gz', '~/.mcp-servers/postgres-mcp')
   // Extracts files

   await exec('python3 -m venv venv && pip install -r requirements.txt')
   // Installs dependencies

   await updateMcpClientConfig('postgres-mcp', {
       command: 'python',
       args: ['~/.mcp-servers/postgres-mcp/server.py'],
       env: { /* from user input */ }
   })
   // Updates claude_desktop_config.json
   ```

### Starting MCP Server

1. User clicks play icon on installed server
2. Extension executes:
   ```typescript
   const process = spawn('python', ['~/.mcp-servers/postgres-mcp/server.py'], {
       env: { ...process.env, DB_HOST: 'localhost', ... }
   })

   process.stdout.on('data', (data) => {
       logOutput += data.toString()
   })

   runningProcesses.set('postgres-mcp', process)
   ```
3. Server starts and listens for MCP client connections

## MCP Client Auto-Configuration

The extension can automatically update configuration files:

### Claude Desktop
```typescript
const configPath = '~/Library/Application Support/Claude/claude_desktop_config.json'
updateConfig(configPath, {
    mcpServers: {
        [serverName]: {
            command: pythonPath,
            args: [serverPath],
            env: envVars
        }
    }
})
```

### Cline (VS Code)
```typescript
const config = vscode.workspace.getConfiguration()
config.update('cline.mcpServers', {
    [serverName]: {
        command: pythonPath,
        args: [serverPath],
        env: envVars
    }
}, vscode.ConfigurationTarget.Global)
```

## Development

### Build Extension

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Package Extension

```bash
npm run package
# Creates mcp-registry-manager-1.0.0.vsix
```

### Install Packaged Extension

```bash
code --install-extension mcp-registry-manager-1.0.0.vsix
```

## Testing

1. Start your MCP registry:
   ```bash
   cd /Users/syedraza/postgres-mcp/mcp-registry
   docker-compose up -d
   ```

2. Publish a test server:
   ```bash
   curl -X POST http://localhost:8000/api/v1/publish \
     -F "package=@test-server.tar.gz" \
     -F "name=test-server" \
     -F "version=1.0.0"
   ```

3. Open VS Code with extension
4. Click MCP Registry icon
5. Verify server appears in "Available Servers"
6. Click download icon to install
7. Click play icon to start
8. Check server is running in "Installed Servers" panel

## Troubleshooting

### Registry Not Accessible

```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**Solution:**
- Check Docker is running: `docker ps`
- Verify registry is up: `curl http://localhost:8000`
- Update registry URL in settings

### Server Won't Start

```
Error: spawn python ENOENT
```

**Solution:**
- Check Python path in settings
- Verify Python is installed: `which python3`
- Check server logs in output panel

### Installation Fails

```
Error: Failed to extract package
```

**Solution:**
- Check file permissions on `~/.mcp-servers/`
- Verify disk space
- Check server logs for details

## Contributing

To add features:

1. Add command to `package.json` → `contributes.commands`
2. Implement handler in `src/extension.ts`
3. Add to menus if needed
4. Update tree providers if needed

## License

MIT
