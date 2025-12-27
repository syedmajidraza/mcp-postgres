# Using MCP Servers from Internal Registry

This guide shows how to use MCP servers from your internal registry with **any MCP client** (Claude Desktop, Cline, Continue, Cursor, Zed, etc.)

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Registry (Your Server)                │
│                                                               │
│  1. Developer publishes MCP server                           │
│     → Upload via Web UI or API                               │
│     → Stored in /storage/mcp-servers/{name}/{version}/       │
│                                                               │
│  2. Other developers discover & download                     │
│     → Browse at http://localhost:3001                        │
│     → Download via API or CLI tool                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Developer's Local Machine                       │
│                                                               │
│  3. Install MCP server locally                               │
│     → Extract package to ~/.mcp-servers/                     │
│     → Install dependencies (pip/npm)                         │
│                                                               │
│  4. Configure MCP client                                     │
│     → Claude Desktop: claude_desktop_config.json             │
│     → Cline (VS Code): settings.json                         │
│     → Continue (VS Code): config.json                        │
│     → Cursor: config.json                                    │
│     → Zed: settings.json                                     │
│                                                               │
│  5. Restart MCP client → MCP server is now available!        │
└─────────────────────────────────────────────────────────────┘
```

---

## Option 1: Manual Download & Install (Works with ALL MCP Clients)

### Step 1: Download from Registry

```bash
# Download the MCP server package
curl -o ~/Downloads/postgres-mcp.tar.gz \
  http://localhost:8000/api/v1/servers/postgres-mcp/1.0.0/download

# Extract the package
mkdir -p ~/mcp-servers
cd ~/mcp-servers
tar -xzf ~/Downloads/postgres-mcp.tar.gz
cd postgres-mcp
```

### Step 2: Install Dependencies

```bash
# For Python MCP servers
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
deactivate

# For Node.js MCP servers
npm install
```

### Step 3: Configure Your MCP Client

**Note:** The path format is CRITICAL - use absolute paths, not relative!

#### For Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "postgres-mcp": {
      "command": "python",
      "args": [
        "/Users/yourname/mcp-servers/postgres-mcp/server.py"
      ],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "mydb",
        "DB_USER": "postgres",
        "DB_PASSWORD": "password"
      }
    }
  }
}
```

**Restart Claude Desktop** after editing.

#### For Cline (VS Code Extension)

Add to VS Code User Settings (`Cmd+,` → Search "Cline MCP" → Edit in settings.json):

```json
{
  "cline.mcpServers": {
    "postgres-mcp": {
      "command": "/Users/yourname/mcp-servers/postgres-mcp/venv/bin/python",
      "args": [
        "/Users/yourname/mcp-servers/postgres-mcp/server.py"
      ],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "mydb"
      }
    }
  }
}
```

**Reload VS Code window** (`Cmd+Shift+P` → "Developer: Reload Window")

#### For Continue (VS Code Extension)

Edit `~/.continue/config.json`:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "python",
          "args": [
            "/Users/yourname/mcp-servers/postgres-mcp/server.py"
          ],
          "env": {
            "DB_HOST": "localhost",
            "DB_PORT": "5432"
          }
        }
      }
    ]
  }
}
```

**Reload VS Code window** after editing.

#### For Cursor

Edit `~/.cursor/config.json` (similar to Continue):

```json
{
  "mcpServers": {
    "postgres-mcp": {
      "command": "python",
      "args": [
        "/Users/yourname/mcp-servers/postgres-mcp/server.py"
      ],
      "env": {
        "DB_HOST": "localhost"
      }
    }
  }
}
```

#### For Zed Editor

Edit `~/.config/zed/settings.json` (Linux/macOS) or `%APPDATA%\Zed\settings.json` (Windows):

```json
{
  "context_servers": {
    "postgres-mcp": {
      "command": {
        "path": "python",
        "args": [
          "/Users/yourname/mcp-servers/postgres-mcp/server.py"
        ],
        "env": {
          "DB_HOST": "localhost"
        }
      }
    }
  }
}
```

**Restart Zed** after editing.

### Step 4: Verify Installation

After restarting your MCP client:
1. Check that the MCP server shows up in the tools/context list
2. Try using a tool from the MCP server
3. Check logs if not working (each client has different log locations)

---

## Option 2: CLI Tool for Automated Installation

The `mcp-install` CLI tool automates downloading, extracting, and installing MCP servers from your registry.

### Install the CLI

```bash
# Download the CLI tool
curl -o /usr/local/bin/mcp-install \
  http://localhost:8000/scripts/mcp-install.sh
chmod +x /usr/local/bin/mcp-install
```

### Usage

```bash
# List all available servers
mcp-install list

# Search for servers
mcp-install search database

# Get server details
mcp-install info postgres-mcp@1.0.0

# Install a server
mcp-install install postgres-mcp@1.0.0

# Show config for your MCP client
mcp-install config postgres-mcp

# Uninstall a server
mcp-install uninstall postgres-mcp
```

The CLI will:
1. Download the package from your registry
2. Extract it to `~/.mcp-servers/{name}/`
3. Auto-detect Python/Node.js and install dependencies
4. Show you the config snippet to add to your MCP client

---

## Option 3: Network Share Auto-Scanning (Optional)

If you enabled the auto-scanning watcher, developers can drop MCP servers into a shared network folder and they'll automatically appear in the registry.

1. Place your MCP server folder in the watched directory
2. The watcher automatically indexes it in the registry
3. Other developers can then download via Option 1 or 2

---

## Browsing Available Servers

### Web UI
Open [http://localhost:3001](http://localhost:3001) in your browser to:
- Browse all available MCP servers
- Search by name, tags, or description
- View download statistics
- Download packages directly

### API

```bash
# List all servers
curl http://localhost:8000/api/v1/servers

# Search for specific server
curl 'http://localhost:8000/api/v1/servers/search?q=postgres'

# Get server details
curl http://localhost:8000/api/v1/servers/postgres-mcp/1.0.0

# Get registry statistics
curl http://localhost:8000/api/v1/stats
```

---

## Publishing MCP Servers to Your Registry

### Via Web UI (Easiest)

1. Package your MCP server:
   ```bash
   cd my-mcp-server
   tar -czf my-mcp-server-1.0.0.tar.gz .
   ```

2. Go to [http://localhost:3001](http://localhost:3001)
3. Click "Publish" tab
4. Drag & drop your `.tar.gz` file or click to browse
5. Fill in the metadata form:
   - Name: `my-mcp-server`
   - Version: `1.0.0`
   - Description: What your server does
   - Author: Your name or team
   - Repository: GitHub/GitLab URL (optional)
   - Tags: Comma-separated tags (e.g., `database,postgres,sql`)
6. Click "Publish Server"

### Via CLI/API

```bash
# Package your MCP server
cd my-mcp-server
tar -czf my-mcp-server-1.0.0.tar.gz .

# Publish to registry
curl -X POST http://localhost:8000/api/v1/publish \
  -F "package=@my-mcp-server-1.0.0.tar.gz" \
  -F "name=my-mcp-server" \
  -F "version=1.0.0" \
  -F "description=My custom MCP server for X functionality" \
  -F "author=Your Name" \
  -F "repository=https://github.com/yourorg/my-mcp-server" \
  -F "tags=custom,internal,tools"
```

### What to Include in Your Package

Your `.tar.gz` package should contain:

**For Python MCP Servers:**
```
my-mcp-server/
├── server.py           # Main server file
├── requirements.txt    # Python dependencies
├── README.md          # Documentation
└── .env.example       # Example environment variables
```

**For Node.js MCP Servers:**
```
my-mcp-server/
├── index.js           # Main server file
├── package.json       # Node.js dependencies
├── package-lock.json
├── README.md
└── .env.example
```

---

## Complete Example: PostgreSQL MCP Server

### 1. Publish to Registry (One-time setup by maintainer)

```bash
cd /Users/syedraza/postgres-mcp/mcp-server
tar -czf postgres-mcp-1.0.0.tar.gz server.py requirements.txt config.py README.md

curl -X POST http://localhost:8000/api/v1/publish \
  -F "package=@postgres-mcp-1.0.0.tar.gz" \
  -F "name=postgres-mcp" \
  -F "version=1.0.0" \
  -F "description=PostgreSQL database operations via MCP" \
  -F "author=Syed Raza" \
  -F "repository=https://github.com/yourorg/postgres-mcp" \
  -F "tags=database,postgresql,sql,queries"
```

### 2. Download & Install (By other developers)

```bash
# Download from registry
mkdir -p ~/mcp-servers && cd ~/mcp-servers
curl -o postgres-mcp.tar.gz \
  http://localhost:8000/api/v1/servers/postgres-mcp/1.0.0/download

# Extract
tar -xzf postgres-mcp.tar.gz
cd postgres-mcp

# Install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### 3. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "postgres-mcp": {
      "command": "/Users/yourname/mcp-servers/postgres-mcp/venv/bin/python",
      "args": [
        "/Users/yourname/mcp-servers/postgres-mcp/server.py"
      ],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "5431",
        "DB_NAME": "Adventureworks",
        "DB_USER": "postgres",
        "DB_PASSWORD": "postgres"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

The PostgreSQL MCP server is now available in Claude Desktop!

---

## Troubleshooting

### MCP Server Not Showing Up

1. **Check absolute paths**: Paths must be absolute (starting with `/` or `C:\`)
2. **Verify Python/Node installation**: Run `which python` or `which node`
3. **Check dependencies**: Make sure `pip install` or `npm install` succeeded
4. **Review client logs**:
   - Claude Desktop: `~/Library/Logs/Claude/` (macOS)
   - VS Code: Developer Tools Console (`Cmd+Shift+I`)
5. **Test MCP server manually**:
   ```bash
   python ~/mcp-servers/postgres-mcp/server.py
   ```

### Registry Not Accessible

1. **Check Docker is running**: `docker ps`
2. **Verify containers are up**:
   ```bash
   docker ps --filter "name=mcp-registry"
   ```
3. **Check ports**:
   ```bash
   curl http://localhost:8000
   curl http://localhost:3001
   ```
4. **Restart registry**:
   ```bash
   cd /Users/syedraza/postgres-mcp/mcp-registry
   docker-compose restart
   ```

### Permission Errors

```bash
# Fix permissions on installed MCP servers
chmod -R 755 ~/mcp-servers/
```

---

## Environment Variables

Set these to customize the CLI tool:

```bash
# Registry URL (default: http://localhost:8000)
export MCP_REGISTRY_URL=http://your-registry-server:8000

# Install directory (default: ~/.mcp-servers)
export MCP_INSTALL_DIR=~/custom-mcp-path
```

---

## Security Notes

- This registry has **NO authentication** - it's designed for internal use only
- Do not expose the registry ports (8000, 3001) to the internet
- Use firewall rules or network policies to restrict access to your internal network
- Consider adding authentication if deploying in a shared environment
