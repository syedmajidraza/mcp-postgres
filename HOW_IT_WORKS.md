# How the PostgreSQL Chatbot Works

This document explains the complete technical flow of how your natural language queries are converted to SQL and executed against your database.

---

## Table of Contents

- [Overview](#overview)
- [The Three Services](#the-three-services)
- [Complete Request Flow](#complete-request-flow)
- [How Copilot Token is Used](#how-copilot-token-is-used)
- [Step-by-Step Example](#step-by-step-example)
- [Why VS Code Must Stay Open](#why-vs-code-must-stay-open)
- [Code Deep Dive](#code-deep-dive)
- [Port Summary](#port-summary)

---

## Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│ Web Server  │────▶│   Copilot   │────▶│ MCP Server  │────▶│ PostgreSQL  │
│             │     │  (9000)     │     │   Bridge    │     │  (3000)     │     │  Database   │
│ You type:   │     │             │     │  (9001)     │     │             │     │             │
│ "Show me    │     │ Routes      │     │             │     │ Executes    │     │ Returns     │
│ employees"  │     │ requests    │     │ Uses GitHub │     │ SQL query   │     │ data        │
│             │     │             │     │ Copilot to  │     │             │     │             │
│             │◀────│             │◀────│ generate    │◀────│             │◀────│             │
│ See results │     │             │     │ SQL         │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**In simple terms:**
1. You type a question in English
2. GitHub Copilot converts it to SQL
3. SQL runs on your database
4. Results are displayed in a table

---

## The Three Services

### 1. Web Server (Port 9000)

**File:** `web-server.js`

**Purpose:** User-facing web interface

**What it does:**
- Serves the HTML chatbot page (`index.html`)
- Receives your chat messages
- Forwards requests to Copilot Bridge
- Returns results to your browser

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves chatbot HTML page |
| `/chat` | POST | Handles chat messages |
| `/health` | GET | Health check |
| `/tool/*` | POST | Direct MCP tool calls |

---

### 2. Copilot Bridge (Port 9001)

**File:** `copilot-web-bridge/src/extension.ts`

**Purpose:** 🔑 **The brain of the system** - converts natural language to SQL

**What it does:**
- Runs as a VS Code extension
- Has access to GitHub Copilot via `vscode.lm` API
- Uses YOUR Copilot subscription (no API key needed)
- Generates SQL from your questions
- Calls MCP Server to execute SQL
- Uses Copilot again to explain results

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Process natural language query |
| `/health` | GET | Health check |

**Why it needs VS Code:**
- Uses `vscode.lm.selectChatModels()` API
- This API only works inside VS Code
- Automatically uses your logged-in Copilot credentials

---

### 3. MCP Server (Port 3000)

**File:** `mcp-server/server.py`

**Purpose:** Database connector with 8 tools

**What it does:**
- Connects to PostgreSQL database
- Executes SQL queries safely
- Returns results as JSON
- Provides database introspection tools

**Available Tools:**
| Tool | Description |
|------|-------------|
| `query_database` | Execute SELECT queries |
| `execute_sql` | Run INSERT/UPDATE/DELETE |
| `list_tables` | List all tables in database |
| `describe_table` | Get table structure/columns |
| `get_table_indexes` | View indexes on a table |
| `analyze_query_plan` | EXPLAIN query execution |
| `create_table` | Create new tables |
| `create_stored_procedure` | Create stored procedures |

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/v1/tools/call` | POST | Execute a tool |
| `/mcp/v1/tools/list` | GET | List available tools |
| `/health` | GET | Health check |

---

## Complete Request Flow

### Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YOUR BROWSER                                    │
│                         http://localhost:9000                                │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  💬 Type: "Show me all employees"                    [Send Button]  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ (1) POST /chat
                                       │ { "message": "Show me all employees" }
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEB SERVER (Port 9000)                               │
│                            web-server.js                                     │
│                                                                              │
│   • Receives HTTP request from browser                                      │
│   • Forwards to Copilot Bridge                                              │
│   • Waits for response                                                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ (2) POST /chat
                                       │ { "message": "Show me all employees" }
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COPILOT BRIDGE (Port 9001)                              │
│                   VS Code Extension: copilot-web-bridge                      │
│                                                                              │
│   🔑 STEP A: Access GitHub Copilot                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ const copilot = await vscode.lm.selectChatModels({ family: 'gpt-4' })│   │
│   │                                                                      │   │
│   │ ✅ Uses YOUR GitHub Copilot subscription                            │   │
│   │ ✅ No API key needed - VS Code handles authentication               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   🔑 STEP B: Generate SQL                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Prompt: "Generate SQL for: Show me all employees"                   │   │
│   │                                                                      │   │
│   │ Copilot Response: "SELECT * FROM employees LIMIT 100"               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ (3) POST /mcp/v1/tools/call
                                       │ {
                                       │   "name": "query_database",
                                       │   "arguments": {
                                       │     "query": "SELECT * FROM employees LIMIT 100"
                                       │   }
                                       │ }
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MCP SERVER (Port 3000)                               │
│                         mcp-server/server.py                                 │
│                                                                              │
│   • Receives SQL query                                                      │
│   • Connects to PostgreSQL using asyncpg                                    │
│   • Executes query safely                                                   │
│   • Returns results as JSON                                                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ (4) SQL Query
                                       │ SELECT * FROM employees LIMIT 100
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL DATABASE                                     │
│                     Adventureworks (Port 5431)                               │
│                                                                              │
│   • Executes the SQL query                                                  │
│   • Returns employee records                                                │
│                                                                              │
│   Result:                                                                   │
│   ┌────────┬──────────┬────────────┬─────────────┐                         │
│   │ emp_id │ name     │ department │ salary      │                         │
│   ├────────┼──────────┼────────────┼─────────────┤                         │
│   │ 1      │ John Doe │ Sales      │ 50000       │                         │
│   │ 2      │ Jane Doe │ Marketing  │ 55000       │                         │
│   │ ...    │ ...      │ ...        │ ...         │                         │
│   └────────┴──────────┴────────────┴─────────────┘                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ (5) JSON Response
                                       │ { "rows": [...], "row_count": 100 }
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COPILOT BRIDGE (Port 9001)                              │
│                                                                              │
│   🔑 STEP C: Explain Results (Using Copilot Again!)                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Prompt: "Explain these results: [employee data...]"                 │   │
│   │                                                                      │   │
│   │ Copilot Response: "Found 100 employees. The data includes          │   │
│   │                    names, departments, and salaries..."             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Final Response:                                                           │
│   {                                                                         │
│     "response": "Found 100 employees...",                                   │
│     "sql": "SELECT * FROM employees LIMIT 100",                             │
│     "data": [{ emp_id: 1, name: "John Doe", ... }, ...],                   │
│     "rowCount": 100                                                         │
│   }                                                                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ (6) Response flows back
                                       │ through Web Server to Browser
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YOUR BROWSER                                    │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  📊 Results (100 rows)                                              │   │
│   │  ┌────────┬──────────┬────────────┬─────────────┐                   │   │
│   │  │ emp_id │ name     │ department │ salary      │                   │   │
│   │  ├────────┼──────────┼────────────┼─────────────┤                   │   │
│   │  │ 1      │ John Doe │ Sales      │ $50,000     │                   │   │
│   │  │ 2      │ Jane Doe │ Marketing  │ $55,000     │                   │   │
│   │  └────────┴──────────┴────────────┴─────────────┘                   │   │
│   │                                                                      │   │
│   │  🔍 SQL Query (click to expand)                                     │   │
│   │  SELECT * FROM employees LIMIT 100                                  │   │
│   │                                                                      │   │
│   │  💬 AI Summary:                                                     │   │
│   │  "Found 100 employees in the database. The data includes..."        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How Copilot Token is Used

### The Magic Line

```typescript
const copilot = await vscode.lm.selectChatModels({ family: 'gpt-4' });
```

### What This Does

| Aspect | Explanation |
|--------|-------------|
| `vscode.lm` | VS Code's Language Model API |
| `selectChatModels()` | Gets available AI models |
| `{ family: 'gpt-4' }` | Requests GPT-4 (GitHub Copilot) |

### How Authentication Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       VS Code Authentication Flow                        │
└─────────────────────────────────────────────────────────────────────────┘

1. You sign in to GitHub Copilot in VS Code (one-time)
   ↓
2. VS Code stores OAuth token in:
   ~/Library/Application Support/Code/User/globalStorage/github.copilot/
   ↓
3. When extension calls vscode.lm.selectChatModels():
   - VS Code automatically retrieves your token
   - Authenticates with GitHub Copilot API
   - Returns a model you can use
   ↓
4. Extension sends requests to Copilot via model.sendRequest()
   - No API key in your code!
   - Uses YOUR Copilot subscription
   - Completely handled by VS Code
```

### Why This is Secure

- ✅ No API keys in code
- ✅ No credentials exposed
- ✅ VS Code handles all authentication
- ✅ Token never leaves your machine
- ✅ Uses official VS Code API

---

## Step-by-Step Example

Let's trace the query: **"How many tables are in the database?"**

### Step 1: User Input

```
Browser: POST http://localhost:9000/chat
Body: { "message": "How many tables are in the database?" }
```

### Step 2: Web Server Routes Request

```javascript
// web-server.js
app.post('/chat', async (req, res) => {
    const { message } = req.body;  // "How many tables are in the database?"

    // Forward to Copilot Bridge
    const response = await fetch('http://localhost:9001/chat', {
        method: 'POST',
        body: JSON.stringify({ message })
    });

    res.json(await response.json());
});
```

### Step 3: Copilot Bridge Receives Request

```typescript
// extension.ts
if (req.url === '/chat' && req.method === 'POST') {
    const { message } = JSON.parse(body);
    // message = "How many tables are in the database?"

    const response = await queryCopilot(message, mcpServerUrl);
    res.end(JSON.stringify(response));
}
```

### Step 4: Copilot Generates SQL

```typescript
// extension.ts - queryCopilot function
const copilot = await vscode.lm.selectChatModels({ family: 'gpt-4' });
const model = copilot[0];

const prompt = `Generate SQL for: "How many tables are in the database?"

Database Schema:
- employees (id, name, department, salary)
- customers (id, name, email, phone)
- orders (id, customer_id, product, amount)

Return ONLY ONE SQL query.`;

const response = await model.sendRequest([
    vscode.LanguageModelChatMessage.User(prompt)
]);

// Copilot returns:
// "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'"
```

### Step 5: MCP Server Executes SQL

```typescript
// extension.ts - callMCPTool function
const result = await fetch('http://localhost:3000/mcp/v1/tools/call', {
    method: 'POST',
    body: JSON.stringify({
        name: 'query_database',
        arguments: {
            query: "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'"
        }
    })
});

// MCP Server returns:
// { "rows": [{ "table_count": 15 }], "row_count": 1 }
```

### Step 6: Copilot Explains Results

```typescript
// extension.ts - queryCopilot function
const explainPrompt = `User asked: "How many tables are in the database?"

SQL Query executed:
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'

Results:
[{ "table_count": 15 }]

Explain these results.`;

const explanation = await model.sendRequest([
    vscode.LanguageModelChatMessage.User(explainPrompt)
]);

// Copilot returns:
// "Your database contains 15 tables in the public schema."
```

### Step 7: Final Response

```json
{
    "response": "Your database contains 15 tables in the public schema.",
    "sql": "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'",
    "data": [{ "table_count": 15 }],
    "rowCount": 1,
    "hasResults": true,
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Why VS Code Must Stay Open

### The Requirement

| Mode | VS Code Status | Works? |
|------|----------------|--------|
| Running | Open (visible) | ✅ Yes |
| Running | Minimized | ✅ Yes |
| Not Running | Closed | ❌ No |

### Technical Reason

The `vscode.lm` API is **only available inside VS Code**:

```typescript
// This ONLY works inside a VS Code extension
import * as vscode from 'vscode';

// This line REQUIRES VS Code to be running
const copilot = await vscode.lm.selectChatModels({ family: 'gpt-4' });
```

If VS Code is closed:
- Extension stops running
- `vscode.lm` API unavailable
- Copilot Bridge server stops
- Port 9001 becomes unreachable
- You see: "Failed to connect to Copilot Bridge"

### Solution: Keep VS Code Minimized

```bash
# start-all.sh minimizes VS Code automatically
osascript <<EOF
tell application "Visual Studio Code"
    set miniaturized of every window to true
end tell
EOF
```

**Result:**
- VS Code runs in background
- Extension stays active
- Copilot Bridge keeps working
- You don't see any window

---

## Code Deep Dive

### Extension Activation

```typescript
// extension.ts
export function activate(context: vscode.ExtensionContext) {
    // Create output channel for logging
    outputChannel = vscode.window.createOutputChannel('Copilot Web Bridge');

    // Register commands
    vscode.commands.registerCommand('copilotWebBridge.start', startServer);
    vscode.commands.registerCommand('copilotWebBridge.stop', stopServer);

    // Auto-start if enabled in settings
    const config = vscode.workspace.getConfiguration('copilotWebBridge');
    if (config.get('autoStart')) {
        startServer();  // Automatically starts HTTP server on port 9001
    }
}
```

### HTTP Server Creation

```typescript
// extension.ts - startServer function
server = http.createServer(async (req, res) => {
    // CORS headers for browser access
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Health check endpoint
    if (req.url === '/health') {
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // Chat endpoint
    if (req.url === '/chat' && req.method === 'POST') {
        const response = await queryCopilot(message, mcpServerUrl);
        res.end(JSON.stringify(response));
        return;
    }
});

server.listen(9001);  // Start listening on port 9001
```

### Copilot Query Function

```typescript
// extension.ts - queryCopilot function
async function queryCopilot(userMessage: string, mcpServerUrl: string) {
    // 1. Get Copilot model
    const copilot = await vscode.lm.selectChatModels({ family: 'gpt-4' });
    const model = copilot[0];

    // 2. Generate SQL
    const sqlPrompt = `Generate SQL for: "${userMessage}"`;
    const sqlResponse = await model.sendRequest([
        vscode.LanguageModelChatMessage.User(sqlPrompt)
    ]);

    // 3. Extract SQL from response
    let sql = '';
    for await (const fragment of sqlResponse.text) {
        sql += fragment;
    }

    // 4. Execute via MCP Server
    const result = await callMCPTool(mcpServerUrl, 'query_database', { query: sql });

    // 5. Explain results with Copilot
    const explainResponse = await model.sendRequest([
        vscode.LanguageModelChatMessage.User(`Explain: ${result}`)
    ]);

    // 6. Return complete response
    return {
        response: explanation,
        sql: sql,
        data: result.rows,
        rowCount: result.row_count
    };
}
```

### MCP Tool Call

```typescript
// extension.ts - callMCPTool function
async function callMCPTool(mcpServerUrl: string, toolName: string, args: any) {
    const response = await fetch(`${mcpServerUrl}/mcp/v1/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: toolName,      // e.g., "query_database"
            arguments: args      // e.g., { query: "SELECT * FROM employees" }
        })
    });

    return await response.json();
}
```

---

## Port Summary

| Port | Service | Technology | Purpose |
|------|---------|------------|---------|
| **9000** | Web Server | Node.js | Chatbot UI & API routing |
| **9001** | Copilot Bridge | VS Code Extension | Natural language → SQL |
| **3000** | MCP Server | Python/FastAPI | Database operations |
| **5431** | PostgreSQL | PostgreSQL | Adventureworks database |

### Network Diagram

```
localhost:9000 ──────▶ localhost:9001 ──────▶ localhost:3000 ──────▶ localhost:5431
   (Web UI)              (Copilot)              (MCP)               (PostgreSQL)
      │                      │                     │                      │
      │                      │                     │                      │
   Node.js              VS Code Ext            Python              Database
   HTTP Server          HTTP Server            FastAPI             Server
```

---

## Quick Reference

### Start All Services

```bash
./start-all.sh
```

### Check Service Status

```bash
curl http://localhost:9000/health   # Web Server
curl http://localhost:9001/health   # Copilot Bridge
curl http://localhost:3000/health   # MCP Server
```

### View Logs

```bash
tail -f /tmp/web-server.log         # Web Server logs
tail -f /tmp/mcp-server.log         # MCP Server logs
# Copilot Bridge logs: VS Code → View → Output → "Copilot Web Bridge"
```

### Stop All Services

```bash
./stop-all.sh
```

---

## Related Documentation

- [README.md](README.md) - Quick start guide
- [SETUP.md](SETUP.md) - Detailed setup instructions
- [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) - More diagrams
- [MULTI_USER.md](MULTI_USER.md) - Multi-user support
- [HEADLESS_MODE.md](HEADLESS_MODE.md) - Running without VS Code window
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment

---

## Summary

| Component | What It Does | Key Technology |
|-----------|--------------|----------------|
| **Browser** | User interface | HTML/CSS/JavaScript |
| **Web Server** | Routes requests | Node.js HTTP |
| **Copilot Bridge** | NL → SQL conversion | VS Code `vscode.lm` API |
| **MCP Server** | Database operations | Python/FastAPI/asyncpg |
| **PostgreSQL** | Data storage | PostgreSQL database |

**The key insight:** The Copilot Bridge is a VS Code extension that uses the `vscode.lm.selectChatModels()` API to access GitHub Copilot. This API automatically uses your logged-in Copilot subscription, so no API keys are needed in your code. VS Code must stay running (can be minimized) for this to work.
