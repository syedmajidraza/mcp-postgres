# Architecture Document — PostgreSQL Chatbot with GitHub Copilot

## Overview

This solution lets users query a PostgreSQL database using **natural language** through a web-based chat interface. It connects three independent services — a web frontend, a VS Code extension (GitHub Copilot bridge), and an MCP database server — to translate human questions into SQL, execute them, and return results with AI-generated explanations.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
│                         http://localhost:9000                                │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                     Web Chatbot UI (index.html)                      │   │
│   │                                                                      │   │
│   │  ┌────────────┐  ┌───────────────┐  ┌────────────────────────────┐   │   │
│   │  │ Chat Input  │  │ Quick Actions │  │ Results Table / AI Summary │  │   │
│   │  └──────┬─────┘  └───────┬───────┘  └────────────────────────────┘   │   │
│   └─────────┼────────────────┼────────────────────────────────────────── ┘   │
│             │                │                                               │
└─────────────┼────────────────┼───────────────────────────────────────────────┘
              │ POST /chat     │ POST /tool/{name}
              ▼                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     WEB SERVER  (Node.js — port 9000)                        │
│                            web-server.js                                     │
│                                                                              │
│   Routes:                                                                    │
│     GET  /           → Serves index.html                                     │
│     GET  /health     → Aggregated health check                               │
│     GET  /agent/info → Service status + available tools                      │
│     POST /chat       → Proxy to Copilot Bridge (port 9001)                   │
│     POST /tool/*     → Proxy to MCP Server (port 3000)                       │
│                                                                              │
└────────────┬─────────────────────────────────┬───────────────────────────────┘
             │                                 │
             │ POST /chat                      │ POST /mcp/v1/tools/call
             ▼                                 ▼
┌───────────────────────────┐    ┌──────────────────────────────────────────────┐
│  COPILOT WEB BRIDGE       │    │          MCP SERVER (Python — port 3000)     │
│  (VS Code Extension       │    │              server.py / stdio_server.py     │
│   — port 9001)            │    │                                              │
│                           │    │   Endpoints:                                 │
│  extension.ts             │    │     GET  /health            → DB status      │
│                           │    │     GET  /mcp/v1/tools      → List tools     │
│  ┌──────────────────────┐ │    │     POST /mcp/v1/tools/call → Execute tool   │
│  │ 1. Receive user msg  │ │    │     POST /configure         → Update config  │
│  │ 2. Fetch DB schema   │─┼───▶│                                              │
│  │    from MCP Server   │ │    │   Tools:                                     │
│  │ 3. Build SQL prompt  │ │    │     query_database (read-only)               │
│  │ 4. Call GPT-4 via    │ │    │     list_tables                              │
│  │    vscode.lm API     │ │    │     get_table_indexes                        │
│  │ 5. Execute SQL via   │─┼───▶│     analyze_query_plan                       │
│  │    MCP Server        │ │    │                                              │
│  │ 6. Explain results   │ │    │                                              │
│  │    with GPT-4        │ │    │   ┌──────────────────────────────────────┐   │
│  │ 7. Return response   │ │    │   │  asyncpg Connection Pool             │   │
│  └──────────────────────┘ │    │   │  (POOL_MIN_SIZE — POOL_MAX_SIZE)     │   │
│                           │    │   └──────────────────┬───────────────────┘   │
└───────────────────────────┘    └──────────────────────┼───────────────────────┘
                                                        │
                                                        ▼
                                          ┌──────────────────────────┐
                                          │     PostgreSQL Database  │
                                          │     (port from .env)     │
                                          │                          │
                                          │  e.g. AdventureWorks     │
                                          └──────────────────────────┘
```

---

## Request Flow — Natural Language Query

This diagram traces a single user question from the browser all the way to the database and back.

```
 User types: "Show me all employees with salary above 70000"
 ─────────────────────────────────────────────────────────────

 ┌─────────┐         ┌────────────┐        ┌────────────────┐       ┌───────────┐       ┌────────┐
 │ Browser  │──(1)──▶│ Web Server │──(2)──▶│ Copilot Bridge │──(3)─▶│ GPT-4     │       │  MCP   │
 │          │        │ :9000      │        │ :9001          │       │ (Copilot) │       │ Server │
 │          │        │            │        │                │◀──(4)─┤           │       │ :3000  │
 │          │        │            │        │                │       └───────────┘       │        │
 │          │        │            │        │                │──(5)─────────────────────▶│        │
 │          │        │            │        │                │  Fetch DB schema          │        │
 │          │        │            │        │                │◀─(6)──────────────────────┤        │
 │          │        │            │        │                │  Schema returned          │        │
 │          │        │            │        │                │                           │        │
 │          │        │            │        │                │──(7)─▶┌───────────┐       │        │
 │          │        │            │        │                │       │ GPT-4     │       │        │
 │          │        │            │        │                │◀─(8)──┤ generates │       │        │
 │          │        │            │        │                │       │ SQL query │       │        │
 │          │        │            │        │                │       └───────────┘       │        │
 │          │        │            │        │                │                           │        │
 │          │        │            │        │                │──(9)─────────────────────▶│        │
 │          │        │            │        │                │  Execute SQL              │──(10)─▶│ PostgreSQL
 │          │        │            │        │                │◀─(11)─────────────────────┤◀─(11)──│
 │          │        │            │        │                │  Query results            │        │
 │          │        │            │        │                │                           │        │
 │          │        │            │        │                │──(12)▶┌───────────┐       │        │
 │          │        │            │        │                │       │ GPT-4     │       │        │
 │          │        │            │        │                │◀(13)──┤ explains  │       │        │
 │          │        │            │        │                │       │ results   │       │        │
 │          │        │            │        │                │       └───────────┘       │        │
 │          │        │            │◀─(14)──┤  JSON response │                           │        │
 │          │◀─(15)──┤            │        │                │                           │        │
 │◀─(16)────┤        │            │        │                │                           │        │
 │ Display  │        │            │        │                │                           │        │
 │ results  │        │            │        │                │                           │        │
 └──────────┘        └────────────┘        └────────────────┘                           └────────┘

 Step Details:
  (1)  Browser sends POST /chat { message: "Show me all employees..." }
  (2)  Web Server proxies request to Copilot Bridge at localhost:9001/chat
  (3)  Extension receives message, detects it's a database query
  (5)  Extension calls MCP Server: list_tables to get available tables
  (6)  MCP Server returns table listing
  (7)  Extension builds prompt with schema + user question, sends to GPT-4
  (8)  GPT-4 returns: SELECT * FROM employees WHERE salary > 70000 LIMIT 100
  (9)  Extension calls MCP Server: query_database with the generated SQL
 (10)  MCP Server executes SQL against PostgreSQL via asyncpg pool
 (11)  Query results returned to Extension
 (12)  Extension sends results + original question to GPT-4 for explanation
 (13)  GPT-4 returns human-readable summary of the results
 (14)  Extension returns JSON: { response, sql, data, rowCount }
 (15)  Web Server forwards response to Browser
 (16)  Browser renders: AI explanation + SQL query + results table
```

---

## Component Details

### 1. Web Chatbot UI (`index.html`)

```
┌───────────────────────────────────────────────────┐
│  PostgreSQL AI Assistant                          │
├───────────────────────────────────────────────────┤
│                                                   │
│  Status: ● MCP Server  ● Copilot Bridge           │
│  Model: GPT-4 (GitHub Copilot)                    │
│  Database: AdventureWorks @ localhost:5431        │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │                                             │  │
│  │  User: Show me all employees with salary    │  │
│  │        above 70000                          │  │
│  │                                             │  │
│  │  Bot: Here are the employees earning more   │  │
│  │       than $70,000...                       │  │
│  │                                             │  │
│  │  SQL: SELECT * FROM employees               │  │
│  │       WHERE salary > 70000 LIMIT 100        │  │
│  │                                             │  │
│  │  ┌─────────┬──────────┬─────────┐           │  │
│  │  │ name    │ dept     │ salary  │           │  │
│  │  ├─────────┼──────────┼─────────┤           │  │
│  │  │ Alice   │ Eng      │ 85000   │           │  │
│  │  │ Bob     │ Sales    │ 72000   │           │  │
│  │  └─────────┴──────────┴─────────┘           │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  Quick Actions:                                   │
│  [Show Tables] [Row Counts] [DB Size]             │
│                                                   │
│  ┌─────────────────────────────────────┐ [Send]   │
│  │ Type your question...               │          │
│  └─────────────────────────────────────┘          │
└───────────────────────────────────────────────────┘
```

- Single-page HTML with embedded CSS and JavaScript
- Calls `GET /agent/info` on load to check service status
- Sends chat messages to `POST /chat`
- Can also directly call MCP tools via `POST /tool/{name}`

### 2. Web Server (`web-server.js` — Port 9000)

A lightweight Node.js HTTP server that acts as a **reverse proxy** and static file server.

```
                    ┌───────────────────────────────────┐
                    │         Web Server :9000          │
                    │                                   │
  GET /  ──────────▶│  Serve index.html                 │
                    │                                   │
  GET /health ─────▶│  Fetch health from :3000 + :9001  │
                    │  Return aggregated status         │
                    │                                   │
  GET /agent/info ─▶│  Fetch info from :3000 + :9001    │
                    │  Return DB config + tools list    │
                    │                                   │
  POST /chat ──────▶│  Proxy ──▶ :9001/chat             │
                    │                                   │
  POST /tool/* ────▶│  Proxy ──▶ :3000/mcp/v1/tools/call│
                    └───────────────────────────────────┘
```

**Why a separate web server?** The browser cannot directly call the VS Code extension. The web server acts as a single entry point that routes requests to the correct backend service.

### 3. Copilot Web Bridge (`extension.ts` — Port 9001)

A VS Code extension that exposes GitHub Copilot's `vscode.lm` API over HTTP.

```
┌──────────────────────────────────────────────────────────┐
│                 VS Code Extension                        │
│                                                          │
│   ┌────────────────────────────────────────────────┐     │
│   │              queryCopilot()                    │     │
│   │                                                │     │
│   │  1. Is this a database query?                  │     │
│   │     └─ keyword detection (table, select, etc.) │     │
│   │                                                │     │
│   │  2. YES → getDatabaseSchema()                  │     │
│   │     └─ Call MCP: list_tables                   │     │
│   │     └─ Call MCP: describe_table (each table)   │     │
│   │                                                │     │
│   │  3. Build prompt: schema + user question       │     │
│   │     └─ Send to GPT-4 via vscode.lm API         │     │
│   │     └─ Receive SQL query                       │     │
│   │                                                │     │
│   │  4. Clean SQL (remove markdown, multi-stmt)    │     │
│   │                                                │     │
│   │  5. Execute SQL via MCP: query_database        │     │
│   │                                                │     │
│   │  6. Build explain prompt: question + results   │     │
│   │     └─ Send to GPT-4 via vscode.lm API         │     │
│   │     └─ Receive human-readable explanation      │     │
│   │                                                │     │
│   │  7. Return { response, sql, data, rowCount }   │     │
│   │                                                │     │
│   │  NO → General chat via GPT-4                   │     │
│   │     └─ Return { response }                     │     │
│   └────────────────────────────────────────────────┘     │
│                                                          │
│   HTTP Server on port 9001                               │
│     GET  /health → { status: "ok" }                      │
│     POST /chat   → queryCopilot(message)                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Why VS Code?** GitHub Copilot's language model API (`vscode.lm`) is only available inside VS Code extensions. There is no standalone API. VS Code must remain running (it can be minimized).

### 4. MCP Server (`server.py` — Port 3000)

A Python FastAPI server implementing the **Model Context Protocol** for read-only PostgreSQL database operations.

```
┌───────────────────────────────────────────────────────────────┐
│                MCP Server :3000 (Read-Only)                    │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐     │
│   │                 FastAPI Application                 │     │
│   │                                                     │     │
│   │  GET  /health                                       │     │
│   │  GET  /mcp/v1/tools          → list all 4 tools     │     │
│   │  POST /mcp/v1/tools/call     → execute a tool       │     │
│   └───────────────────────┬─────────────────────────────┘     │
│                           │                                   │
│                           ▼                                   │
│   ┌─────────────────────────────────────────────────────┐     │
│   │             Tool Router (read-only)                 │     │
│   │                                                     │     │
│   │  "query_database"     → execute_query()             │     │
│   │  "list_tables"        → list_tables()               │     │
│   │  "get_table_indexes"  → get_table_indexes()         │     │
│   │  "analyze_query_plan" → analyze_query_plan()        │     │
│   └───────────────────────┬─────────────────────────────┘     │
│                           │                                   │
│                           ▼                                   │
│   ┌─────────────────────────────────────────────────────┐     │
│   │          asyncpg Connection Pool                    │     │
│   │                                                     │     │
│   │    min_size: POOL_MIN_SIZE    (from .env)           │     │
│   │    max_size: POOL_MAX_SIZE    (from .env)           │     │
│   │                                                     │     │
│   │    Connections are reused across requests for       │     │
│   │    high throughput and low latency.                 │     │
│   └───────────────────────┬─────────────────────────────┘     │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │ TCP
                            ▼
                  ┌──────────────────┐
                  │   PostgreSQL     │
                  │   DB_HOST:DB_PORT│
                  └──────────────────┘
```

**Stdio mode (`stdio_server.py`)**: An alternative server that communicates over stdin/stdout using JSON-RPC, designed for direct integration with VS Code or other MCP-compatible clients without HTTP.

### 5. Configuration (`config.py` + `.env`)

All configuration is loaded from the `.env` file at startup. No hardcoded defaults.

```
┌─────────────────────────────────────────────┐
│                .env file                    │
│                                             │
│   DB_HOST=localhost                         │
│   DB_PORT=5431                              │
│   DB_NAME=Adventureworks                    │
│   DB_USER=postgres                          │
│   DB_PASSWORD=postgres                      │
│                                             │
│   SERVER_HOST=127.0.0.1                     │
│   SERVER_PORT=3000                          │
│                                             │
│   POOL_MIN_SIZE=2                           │
│   POOL_MAX_SIZE=10                          │
└──────────────────┬──────────────────────────┘
                   │
                   ▼  load_dotenv()
┌──────────────────────────────────────────────┐
│              config.py                       │
│                                              │
│  _require_env(key)                           │
│    → reads os.getenv(key)                    │
│    → exits with error if missing             │
│                                              │
│  Config.DB_HOST      Config.SERVER_HOST      │
│  Config.DB_PORT      Config.SERVER_PORT      │
│  Config.DB_NAME      Config.POOL_MIN_SIZE    │
│  Config.DB_USER      Config.POOL_MAX_SIZE    │
│  Config.DB_PASSWORD                          │
│  Config.get_database_url()                   │
└──────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
   server.py              stdio_server.py
```

If any required variable is missing from `.env`, the server exits immediately with a clear error message identifying the missing variable.

---

## Service Ports

```
┌────────────────────────────────────────────────────┐
│                   localhost                        │
│                                                    │
│   :9000  ─── Web Server (Node.js)                  │
│              Serves UI + proxies requests          │
│                                                    │
│   :9001  ─── Copilot Web Bridge (VS Code)          │
│              AI query generation via GPT-4         │
│                                                    │
│   :3000  ─── MCP Server (Python/FastAPI)           │
│              Database operations                   │
│                                                    │
│   :5431  ─── PostgreSQL Database                   │
│              (configurable via .env)               │
│                                                    │
└────────────────────────────────────────────────────┘
```

All services bind to `127.0.0.1` (localhost only) for security.

---

## Startup & Shutdown

### Starting (`start-all.sh`)

```
start-all.sh
    │
    ├── 1. Start MCP Server
    │      cd mcp-server && python server.py
    │      Wait for :3000 to be ready
    │
    ├── 2. Start VS Code + Extension
    │      code --goto . (with copilot-web-bridge extension)
    │      Wait for :9001 to be ready
    │
    ├── 3. Start Web Server
    │      node web-server.js
    │      Wait for :9000 to be ready
    │
    └── 4. Open browser
           http://localhost:9000
```

### Stopping (`stop-all.sh`)

```
stop-all.sh
    │
    ├── Kill process on :9000 (Web Server)
    ├── Kill process on :9001 (handled by VS Code)
    └── Kill process on :3000 (MCP Server)
```

---

## MCP Tools Reference (Read-Only)

| Tool | Input | Output | Description |
|------|-------|--------|-------------|
| `query_database` | `{ query: string }` | `{ rows, row_count }` | Execute SELECT queries |
| `list_tables` | `{ schema?: string }` | `{ schema, tables[], count }` | List tables in schema |
| `get_table_indexes` | `{ table_name: string }` | `{ table_name, indexes[] }` | List indexes on a table |
| `analyze_query_plan` | `{ query: string }` | `{ query, plan }` | EXPLAIN a query (JSON format) |

---

## Two Server Modes

The MCP server can run in two modes:

```
┌──────────────────────┐          ┌──────────────────────┐
│   HTTP Mode          │          │   Stdio Mode         │
│   (server.py)        │          │   (stdio_server.py)  │
│                      │          │                      │
│  - FastAPI + Uvicorn │          │  - JSON-RPC over     │
│  - REST endpoints    │          │    stdin/stdout      │
│  - Used by web UI    │          │  - Used by VS Code   │
│  - Port 3000         │          │    MCP client        │
│  - Read-only tools   │          │  - No HTTP server    │
│                      │          │  - Read-only tools   │
└──────────────────────┘          └──────────────────────┘
```

**HTTP mode** is used when running the full web chatbot solution. **Stdio mode** is used for direct integration with VS Code or other tools that speak the MCP protocol over standard I/O.

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│  Frontend                                               │
│    HTML/CSS/JavaScript (vanilla, no framework)          │
├─────────────────────────────────────────────────────────┤
│  Web Server                                             │
│    Node.js (built-in http module, no dependencies)      │
├─────────────────────────────────────────────────────────┤
│  AI Layer                                               │
│    VS Code Extension (TypeScript)                       │
│    GitHub Copilot / GPT-4 (via vscode.lm API)           │
├─────────────────────────────────────────────────────────┤
│  Database Layer                                         │
│    Python 3.9+ / FastAPI / Uvicorn                      │
│    asyncpg (async PostgreSQL driver)                    │
│    python-dotenv (environment configuration)            │
├─────────────────────────────────────────────────────────┤
│  Database                                               │
│    PostgreSQL                                           │
└──────────────────────────────────────────────────────-──┘
```

---

## Security Considerations

| Aspect | Implementation |
|--------|----------------|
| **Network binding** | All services bind to `127.0.0.1` — not accessible from other machines |
| **Read-only MCP** | MCP server only exposes read operations — no CREATE, INSERT, UPDATE, or DELETE tools |
| **SQL safety** | Copilot Bridge strips multi-statement SQL, only first statement is executed |
| **No auth on HTTP** | Services trust localhost; do not expose ports to the internet |
| **Credentials** | Database password stored in `.env` (git-ignored), never hardcoded |
| **Connection pooling** | Limits max connections to prevent resource exhaustion |

---

## File Structure

```
mcp-postgres/
├── index.html                          # Web chatbot UI
├── web-server.js                       # Node.js proxy server (port 9000)
├── start-all.sh                        # Start all 3 services
├── stop-all.sh                         # Stop all services
├── README.md                           # Quick start guide
├── SETUP.md                            # Detailed setup instructions
├── ARCHITECTURE.md                     # This document
├── LICENSE                             # MIT License
│
├── docs/
│   ├── screenshot-ui.png               # UI screenshot
│   └── feature.png                     # Feature overview image
│
├── copilot-web-bridge/                 # VS Code extension
│   ├── package.json                    # Extension manifest + config
│   ├── tsconfig.json                   # TypeScript config
│   ├── src/
│   │   └── extension.ts               # Extension source (HTTP server + Copilot calls)
│   └── copilot-web-bridge-1.0.0.vsix  # Pre-built extension package
│
└── mcp-server/                         # PostgreSQL MCP server
    ├── config.py                       # Configuration from .env (no defaults)
    ├── server.py                       # HTTP/FastAPI server (port 3000)
    ├── stdio_server.py                 # Stdio/JSON-RPC server (alternative)
    ├── requirements.txt                # Python dependencies
    ├── .env                            # Environment variables (git-ignored)
    ├── .env.example                    # Template for .env
    ├── start.sh                        # Linux/macOS startup script
    ├── start.bat                       # Windows startup script
    └── README.md                       # MCP server API docs
```
