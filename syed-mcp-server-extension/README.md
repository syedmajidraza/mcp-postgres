# Syed MCP Server Extension

VS Code extension to manage MCP servers from your internal registry.

## Quick Start

### Install Extension

```bash
code --install-extension syed-mcp-server-extension-1.0.0.vsix
```

### Usage

1. **Open MCP Servers sidebar** - Click the server icon in the activity bar
2. **Browse Registry** - View available servers in the "Registry" panel
3. **Install Server** - Click download icon on any server
4. **Configure** - Click gear icon to set environment variables (DB credentials, API keys, etc.)
5. **Start Server** - Click play icon to start the server
6. **View Logs** - Right-click server → View Logs

## Features

- ✅ Browse internal MCP registry
- ✅ One-click install servers
- ✅ Start/Stop/Restart servers
- ✅ Configure environment variables (secure storage)
- ✅ View server logs
- ✅ Search registry
- ✅ Auto-install dependencies (Python/Node.js)

## Configuration

Settings available in VS Code settings:

- **Registry URL**: Internal registry URL (default: `http://localhost:8000`)
- **Install Directory**: Where servers are installed (default: `~/.mcp-servers`)
- **Auto Start**: Auto-start servers on VS Code startup
- **Python Path**: Path to Python executable
- **Node Path**: Path to Node.js executable

## Commands

- `MCP: Refresh Registry` - Refresh server list
- `MCP: Install Server` - Install server from registry
- `MCP: Start Server` - Start installed server
- `MCP: Stop Server` - Stop running server
- `MCP: Configure Server` - Set environment variables
- `MCP: View Server Logs` - View server output
- `MCP: Search Registry` - Search for servers

## Requirements

- Python 3.x (for Python-based MCP servers)
- Node.js (for Node.js-based MCP servers)
- Access to internal MCP registry

## Support

For issues, check the MCP Server Manager output channel in VS Code.
