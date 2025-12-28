# MCP Registry & Server Manager

Complete internal solution for managing MCP servers - publish, browse, install, and run MCP servers locally.

---

## 📦 Components

### 1. **MCP Registry** (Docker/Podman)
Central registry for hosting MCP servers internally.
- **Location:** `mcp-registry/`
- **Ports:** Backend (8000), Frontend (3001)
- **Supports:** Docker & Podman

### 2. **PostgreSQL MCP Server**
Query PostgreSQL databases via MCP protocol.
- **Location:** `mcp-server/`
- **Tools:** Query DB, List Tables, Describe Schema

### 3. **MarkItDown MCP Server**
Convert any file to Markdown (PDF, Word, Excel, Images, etc.).
- **Location:** `markitdown-mcp/`
- **Tools:** Convert Files, Convert URLs, List Supported Formats
- **Formats:** PDF, DOCX, XLSX, PPTX, Images, HTML, CSV, JSON, ZIP

### 4. **VS Code Extension**
Unified manager for all MCP servers.
- **Location:** `syed-mcp-server-extension/`
- **Features:** Install, Start, Stop, Configure, View Logs, Start All, Stop All
- **Smart Features:** Auto port conflict detection, Persistent status tracking

---

## 🚀 Quick Start

### 1. Start MCP Registry

**Docker:**
```bash
cd mcp-registry
docker-compose up -d
```

**Podman:**
```bash
cd mcp-registry
podman-compose up -d
```

**Access:**
- Web UI: http://localhost:3001
- API: http://localhost:8000

### 2. Install VS Code Extension

```bash
code --install-extension syed-mcp-server-extension/syed-mcp-server-extension-1.0.0.vsix
```

**Reload VS Code:** `Cmd+Shift+P` → "Developer: Reload Window"

### 3. Use Extension

1. **Click MCP Servers icon** in VS Code sidebar
2. **See Registry panel** with available servers
3. **Click download icon** on postgres-mcp → Installs
4. **Click gear icon** → Configure DB credentials
5. **Click play icon** → Server starts
6. **Query your database** via any MCP client!

---

## 📖 Developer Guide

### Publish MCP Server to Registry

```bash
# Package your server
cd my-mcp-server
tar -czf my-server-1.0.0.tar.gz .

# Publish via API
curl -X POST http://localhost:8000/api/v1/publish \
  -F "package=@my-server-1.0.0.tar.gz" \
  -F "name=my-server" \
  -F "version=1.0.0" \
  -F "description=My MCP server" \
  -F "author=Your Name" \
  -F "tags=database,custom"
```

Or use **Web UI:** http://localhost:3001 → Publish tab

### Install & Run MCP Server

**Via VS Code Extension:**
1. Open MCP Servers panel
2. Find server in Registry panel
3. Click download → Install
4. Click gear → Configure
5. Click play → Start
6. Server runs at `~/.mcp-servers/{name}/`

**Via Command Palette:**
- `Cmd+Shift+P` → `MCP: Install Server`
- Select from dropdown
- Configure and start

---

## 🎯 Use Cases

### Query Database with AI

1. Install `postgres-mcp` via extension
2. Configure: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
3. Start server
4. Use with Claude Desktop/Cline/Continue
5. Ask: "List all tables" or "Show sales data"

### Convert Files to Markdown

1. Install `markitdown-mcp` via extension
2. Click play icon to start server
3. Use with Claude Desktop/Cline/Continue
4. Ask: "Convert /path/to/file.pdf to markdown"
5. Supports: PDF, Word, Excel, PowerPoint, Images, HTML, URLs

**Supported Formats:**
- **Documents**: PDF, DOCX, XLSX, PPTX
- **Images**: JPG, PNG, GIF, TIFF, WebP
- **Web**: HTML files, Any webpage URL
- **Data**: CSV, JSON, XML
- **Archives**: ZIP (extracts and converts)

**Example Prompts:**
```
"Convert this PDF to markdown: /Users/john/Documents/report.pdf"
"Convert this webpage: https://github.com/microsoft/markitdown"
"What file formats can you convert?"
"Convert all PDFs in /Users/john/Documents/"
```

### Team Setup

1. **Admin:** Publish approved MCP servers to registry
2. **Developers:** Install VS Code extension
3. **Developers:** Browse registry, install needed servers
4. **Everyone:** Uses same tested MCP servers
5. **Centralized** version management and updates

---

## 🛠️ Management

### MCP Registry

**Start (Docker):**
```bash
cd mcp-registry
docker-compose up -d
```

**Start (Podman):**
```bash
cd mcp-registry
podman-compose up -d
```

**Stop (Docker):**
```bash
docker-compose down
```

**Stop (Podman):**
```bash
podman-compose down
```

**API:**
- `GET /api/v1/servers` - List servers
- `GET /api/v1/servers/search?q=query` - Search
- `POST /api/v1/publish` - Publish server
- `GET /api/v1/servers/{name}/{version}/download` - Download

### VS Code Extension Commands

- `MCP: Install Server` - Install from registry
- `MCP: Start Server` - Start individual server
- `MCP: Stop Server` - Stop individual server
- `MCP: Start All Servers` - Start all installed servers
- `MCP: Stop All Servers` - Stop all running servers
- `MCP: Configure Server` - Set environment vars
- `MCP: View Server Logs` - Debug logs
- `MCP: Refresh Registry` - Reload list

**Smart Features:**
- 🟢 Green checkmark for running servers
- 🔴 Red circle-slash for stopped servers
- Auto-kills processes using conflicting ports
- Status persists across VS Code reloads

### VS Code Extension Settings

```json
{
  "mcpManager.registryUrl": "http://localhost:8000",
  "mcpManager.installDirectory": "~/.mcp-servers",
  "mcpManager.pythonPath": "python3"
}
```

### Claude Desktop Configuration

To use MCP servers with Claude Desktop, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "postgres-mcp": {
      "command": "python3",
      "args": [
        "/Users/YOUR_USERNAME/.mcp-servers/postgres-mcp/server.py"
      ],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "your_database",
        "DB_USER": "your_username",
        "DB_PASSWORD": "your_password"
      }
    },
    "markitdown-mcp": {
      "command": "python3",
      "args": [
        "/Users/YOUR_USERNAME/.mcp-servers/markitdown-mcp/server.py"
      ]
    }
  }
}
```

**Then:**
1. Restart Claude Desktop
2. Look for 🔌 icon showing connected MCP servers
3. Ask Claude to use the tools:
   - "List all tables in my database"
   - "Convert this PDF to markdown: /path/to/file.pdf"
   - "What file formats can markitdown convert?"

---

## 📁 Structure

```
postgres-mcp/
├── mcp-registry/              # Docker registry
│   ├── backend/               # FastAPI
│   ├── frontend/              # Web UI
│   └── docker-compose.yml
│
├── mcp-server/                # PostgreSQL MCP
│   ├── server.py
│   ├── config.py
│   └── requirements.txt
│
├── markitdown-mcp/            # MarkItDown MCP
│   ├── server.py
│   ├── config.json
│   ├── requirements.txt
│   └── README.md
│
└── syed-mcp-server-extension/  # VS Code ext
    ├── src/
    ├── package.json
    └── syed-mcp-server-extension-1.0.0.vsix
```

---

## 🐛 Troubleshooting

**Registry not accessible:**
```bash
# Docker
docker ps
# OR Podman
podman ps

# Test API
curl http://localhost:8000
```

**Extension not showing:**
```
Cmd+Shift+P → "Developer: Reload Window"
```

**Server won't start:**
1. Check configuration (gear icon)
2. View logs (right-click → View Logs)
3. Verify DB credentials

**Installation fails:**
1. Check Output panel: View → Output → "MCP Server Manager"
2. Verify registry URL: `curl http://localhost:8000`
3. Check permissions: `ls -la ~/.mcp-servers/`

---

## ✅ What You Get

### Infrastructure
- ✅ **Internal MCP Registry** - No public dependencies, fully self-hosted
- ✅ **One-Click Install** - Browse and install from VS Code
- ✅ **Smart Server Management** - Start/Stop/Configure via GUI with visual status indicators
- ✅ **Auto Port Conflict Resolution** - Automatically kills processes using conflicting ports
- ✅ **Persistent Status Tracking** - Server status survives VS Code reloads
- ✅ **Bulk Operations** - Start/Stop all servers with one click
- ✅ **Team Distribution** - Centralized, version-controlled servers

### MCP Servers Included
- ✅ **PostgreSQL MCP** - Ask AI to query your databases, list tables, describe schemas
- ✅ **MarkItDown MCP** - Convert PDF, Word, Excel, PowerPoint, Images to Markdown
- ✅ **Easy Publishing** - Package and publish your own MCP servers to the registry

### Compatible Clients
- ✅ **Works with any MCP client** - Claude Desktop, Cline, Continue, Cursor, Zed

---

**Everything runs locally. Developers query databases through AI assistants.** 🚀
