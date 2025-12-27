# MCP Registry Complete Flow

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Your Internal MCP Registry                     │
│                                                                    │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │   Frontend UI    │         │  Backend API     │              │
│  │  (localhost:3001)│◄────────┤ (localhost:8000) │              │
│  │                  │         │                  │              │
│  │  - Browse        │         │  - Publish       │              │
│  │  - Search        │         │  - Download      │              │
│  │  - Upload        │         │  - Search        │              │
│  └──────────────────┘         │  - Stats         │              │
│                                └──────────────────┘              │
│                                         │                         │
│                                         ▼                         │
│                          ┌──────────────────────────┐            │
│                          │  Storage                 │            │
│                          │  /storage/mcp-servers/   │            │
│                          │    ├── server1/          │            │
│                          │    │   └── 1.0.0/        │            │
│                          │    └── server2/          │            │
│                          │        └── 1.0.0/        │            │
│                          └──────────────────────────┘            │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Download
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Developer's Local Machine                       │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ~/.mcp-servers/                                         │   │
│  │    ├── postgres-mcp/                                     │   │
│  │    │   ├── server.py                                     │   │
│  │    │   ├── requirements.txt                              │   │
│  │    │   └── venv/                                         │   │
│  │    └── another-server/                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  MCP Client Configuration                                │   │
│  │  (Claude Desktop, Cline, Continue, Cursor, Zed, etc.)    │   │
│  │                                                           │   │
│  │  Points to: ~/.mcp-servers/postgres-mcp/server.py       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Flow 1: Publishing an MCP Server

```
Developer with MCP Server
          │
          │ 1. Package the server
          │    tar -czf server-1.0.0.tar.gz .
          ▼
    ┌─────────┐
    │ .tar.gz │
    └─────────┘
          │
          │ 2. Upload to registry
          │    Via Web UI (http://localhost:3001/publish)
          │    OR via API (POST /api/v1/publish)
          ▼
  ┌───────────────────┐
  │  MCP Registry     │
  │  Backend          │
  └───────────────────┘
          │
          │ 3. Store package & metadata
          ▼
  ┌───────────────────────────────┐
  │ /storage/mcp-servers/         │
  │   └── postgres-mcp/           │
  │       └── 1.0.0/              │
  │           ├── package.tar.gz  │
  │           └── metadata.json   │
  └───────────────────────────────┘
          │
          │ 4. Index in database
          ▼
  ┌───────────────────┐
  │  servers_db[]     │
  │  (in-memory list) │
  └───────────────────┘
          │
          │ 5. Now available for download!
          ▼
    Other Developers
```

---

## Flow 2: Installing an MCP Server (Manual)

```
Developer needs MCP Server
          │
          │ 1. Browse registry
          │    http://localhost:3001
          ▼
  ┌───────────────────┐
  │  Registry Web UI  │
  │  - Browse         │
  │  - Search         │
  └───────────────────┘
          │
          │ 2. Download package
          │    curl http://localhost:8000/api/v1/servers/{name}/{version}/download
          ▼
    ┌─────────┐
    │ .tar.gz │
    └─────────┘
          │
          │ 3. Extract to ~/.mcp-servers/
          │    tar -xzf package.tar.gz -C ~/.mcp-servers/
          ▼
  ┌─────────────────────┐
  │ ~/.mcp-servers/     │
  │   └── postgres-mcp/ │
  │       ├── server.py │
  │       ├── ...       │
  │       └── venv/     │
  └─────────────────────┘
          │
          │ 4. Install dependencies
          │    python -m venv venv && pip install -r requirements.txt
          ▼
  ┌─────────────────────┐
  │ Ready to configure! │
  └─────────────────────┘
          │
          │ 5. Add to MCP client config
          │    Edit claude_desktop_config.json
          │    or VS Code settings.json
          ▼
  ┌──────────────────────────────┐
  │  MCP Client                  │
  │  (Claude Desktop, Cline, etc)│
  │                              │
  │  Loads MCP server on startup │
  └──────────────────────────────┘
```

---

## Flow 3: Installing an MCP Server (CLI Tool)

```
Developer needs MCP Server
          │
          │ 1. Install CLI tool (one-time)
          │    curl -o /usr/local/bin/mcp-install http://localhost:8000/scripts/mcp-install.sh
          │    chmod +x /usr/local/bin/mcp-install
          ▼
  ┌───────────────────┐
  │  mcp-install CLI  │
  └───────────────────┘
          │
          │ 2. List available servers
          │    mcp-install list
          ▼
  ┌───────────────────┐
  │  Shows all        │
  │  available servers│
  └───────────────────┘
          │
          │ 3. Install server
          │    mcp-install install postgres-mcp@1.0.0
          ▼
  ┌──────────────────────────────────┐
  │  CLI Automatically:               │
  │  1. Downloads from registry       │
  │  2. Extracts to ~/.mcp-servers/   │
  │  3. Detects Python/Node           │
  │  4. Installs dependencies         │
  │  5. Shows config snippet          │
  └──────────────────────────────────┘
          │
          │ 4. Copy config to MCP client
          │    Paste into claude_desktop_config.json
          ▼
  ┌──────────────────────────────┐
  │  MCP Client                  │
  │  Ready to use!               │
  └──────────────────────────────┘
```

---

## Flow 4: MCP Client Connecting to MCP Server

```
User opens MCP Client (Claude Desktop, Cline, etc)
          │
          │ 1. Client reads config
          │    claude_desktop_config.json
          ▼
  ┌────────────────────────────────┐
  │  {                             │
  │    "mcpServers": {             │
  │      "postgres-mcp": {         │
  │        "command": "python",    │
  │        "args": ["server.py"],  │
  │        "env": {...}            │
  │      }                         │
  │    }                           │
  │  }                             │
  └────────────────────────────────┘
          │
          │ 2. Client spawns MCP server process
          │    python ~/.mcp-servers/postgres-mcp/server.py
          ▼
  ┌────────────────────────────────┐
  │  MCP Server Process            │
  │  (Running in background)       │
  │                                │
  │  Listens on stdio for          │
  │  JSON-RPC messages             │
  └────────────────────────────────┘
          │
          │ 3. Client sends initialization
          │    {"jsonrpc": "2.0", "method": "initialize", ...}
          ▼
  ┌────────────────────────────────┐
  │  MCP Server responds with      │
  │  capabilities and tools        │
  │                                │
  │  {                             │
  │    "tools": [                  │
  │      {"name": "query_db", ...},│
  │      {"name": "list_tables",...}│
  │    ]                           │
  │  }                             │
  └────────────────────────────────┘
          │
          │ 4. Client shows tools to user
          ▼
  ┌────────────────────────────────┐
  │  User Interface                │
  │                                │
  │  Available tools:              │
  │  - query_db                    │
  │  - list_tables                 │
  │  - describe_table              │
  └────────────────────────────────┘
          │
          │ 5. User asks: "Show me all tables"
          ▼
  ┌────────────────────────────────┐
  │  Client calls tool             │
  │  {"method": "tools/call",      │
  │   "params": {                  │
  │     "name": "list_tables"      │
  │   }}                           │
  └────────────────────────────────┘
          │
          │ 6. MCP server executes
          ▼
  ┌────────────────────────────────┐
  │  PostgreSQL Database           │
  │  SELECT * FROM tables          │
  └────────────────────────────────┘
          │
          │ 7. Returns results
          ▼
  ┌────────────────────────────────┐
  │  Client shows results to user  │
  │                                │
  │  "Found 5 tables:              │
  │   - users                      │
  │   - products                   │
  │   - orders                     │
  │   ..."                         │
  └────────────────────────────────┘
```

---

## Data Flow for Publishing

```
Step 1: Package Creation
┌──────────────────────────┐
│  Developer's MCP Server  │
│  ├── server.py          │
│  ├── requirements.txt   │
│  └── README.md          │
└──────────────────────────┘
         │
         │ tar -czf postgres-mcp-1.0.0.tar.gz .
         ▼
┌──────────────────────────┐
│  postgres-mcp-1.0.0.tar.gz│
└──────────────────────────┘

Step 2: Upload to Registry
         │
         │ POST /api/v1/publish
         │ FormData:
         │   - package: (binary)
         │   - name: "postgres-mcp"
         │   - version: "1.0.0"
         │   - description: "..."
         │   - tags: "database,sql"
         ▼
┌──────────────────────────┐
│  Registry Backend        │
│  main.py                 │
└──────────────────────────┘
         │
         │ 1. Validate inputs
         │ 2. Check version conflict
         │ 3. Save to disk
         ▼
┌────────────────────────────────┐
│  /storage/mcp-servers/         │
│    └── postgres-mcp/           │
│        └── 1.0.0/              │
│            ├── postgres-mcp... │
│            └── metadata.json   │
└────────────────────────────────┘
         │
         │ 4. Add to in-memory DB
         ▼
┌────────────────────────────────┐
│  servers_db = [               │
│    {                          │
│      "name": "postgres-mcp",  │
│      "version": "1.0.0",      │
│      "downloads": 0,          │
│      ...                      │
│    }                          │
│  ]                            │
└────────────────────────────────┘
         │
         │ 5. Return success
         ▼
┌────────────────────────────────┐
│  HTTP 200 OK                   │
│  {                             │
│    "success": true,            │
│    "download_url": "/api/..."  │
│  }                             │
└────────────────────────────────┘
```

---

## Data Flow for Downloading

```
Step 1: User requests download
┌────────────────────────────────┐
│  GET /api/v1/servers/          │
│      postgres-mcp/1.0.0/download│
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  Registry Backend              │
│  def download_server():        │
└────────────────────────────────┘
         │
         │ 1. Look up in servers_db
         ▼
┌────────────────────────────────┐
│  Find server metadata          │
│  {                             │
│    "name": "postgres-mcp",     │
│    "version": "1.0.0",         │
│    "filename": "...tar.gz",    │
│    "downloads": 5              │
│  }                             │
└────────────────────────────────┘
         │
         │ 2. Get file path
         ▼
┌────────────────────────────────┐
│  /storage/mcp-servers/         │
│    postgres-mcp/1.0.0/         │
│      postgres-mcp-1.0.0.tar.gz │
└────────────────────────────────┘
         │
         │ 3. Increment download count
         │    downloads: 5 → 6
         │
         │ 4. Return file
         ▼
┌────────────────────────────────┐
│  HTTP 200 OK                   │
│  Content-Type: application/... │
│  Content-Disposition: attach...│
│  [binary file content]         │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  User's Downloads folder       │
│  postgres-mcp-1.0.0.tar.gz     │
└────────────────────────────────┘
```

---

## Comparison: Public Registry vs Your Internal Registry

```
┌────────────────────────────────────────────────────────────────┐
│               Public MCP Registry (Anthropic)                   │
│                 https://github.com/modelcontextprotocol/registry│
├────────────────────────────────────────────────────────────────┤
│  • GitHub-based (JSON files in repo)                           │
│  • No package hosting (links to npm/PyPI)                      │
│  • Manual PR submission                                        │
│  • Public packages only                                        │
│  • No authentication                                           │
│  • Community maintained                                        │
└────────────────────────────────────────────────────────────────┘
                            vs
┌────────────────────────────────────────────────────────────────┐
│               Your Internal MCP Registry                        │
│                 http://localhost:8000                           │
├────────────────────────────────────────────────────────────────┤
│  • Self-hosted (Docker containers)                             │
│  • Full package hosting (stores .tar.gz files)                 │
│  • Instant publishing (Web UI or API)                          │
│  • Private/internal packages                                   │
│  • No authentication (internal network only)                   │
│  • Your team controls it                                       │
│  • Download stats tracking                                     │
│  • Search functionality                                        │
│  • CLI tool for easy installation                              │
└────────────────────────────────────────────────────────────────┘
```

---

## Key Differences: Your Setup vs Public Workflow

### Public Registry Workflow (Current Developer Experience)

```
1. Developer finds MCP server on public registry
   https://github.com/modelcontextprotocol/registry

2. Registry points to npm/PyPI/GitHub
   "Installation: npm install @modelcontextprotocol/server-postgres"

3. Developer installs via npm/pip
   npm install @modelcontextprotocol/server-postgres

4. Developer configures in MCP client
   Edit claude_desktop_config.json

5. Restart client
```

### Your Internal Registry Workflow

```
1. Developer browses your internal registry
   http://localhost:3001

2. Developer downloads from YOUR registry
   curl http://localhost:8000/api/v1/servers/postgres-mcp/1.0.0/download

3. Developer extracts and installs locally
   tar -xzf package.tar.gz && pip install -r requirements.txt

4. Developer configures in MCP client
   Edit claude_desktop_config.json (same as public)

5. Restart client (same as public)
```

**Key Benefit**: Your team hosts their own proprietary/internal MCP servers that don't need to be published to public npm/PyPI registries!

---

## Security Considerations

```
┌────────────────────────────────────────────────────────────────┐
│                     Network Topology                            │
└────────────────────────────────────────────────────────────────┘

Internet
   │
   │ ❌ Firewall blocks ports 8000, 3001
   ▼
┌──────────────────────────────────┐
│  Corporate Network/VPN           │
│                                  │
│  ┌────────────────────────────┐ │
│  │  MCP Registry Server       │ │
│  │  - Backend: :8000          │ │
│  │  - Frontend: :3001         │ │
│  │  - No authentication       │ │
│  └────────────────────────────┘ │
│           │                      │
│           │ Internal network     │
│           │ only                 │
│           ▼                      │
│  ┌────────────────────────────┐ │
│  │  Developer Machines        │ │
│  │  - Download MCP servers    │ │
│  │  - Run MCP clients         │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘

✅ Safe: Registry only accessible within internal network
❌ Unsafe: Exposing registry to internet without authentication
```
