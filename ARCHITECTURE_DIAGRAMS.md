# PostgreSQL Chatbot - Architecture & Flow Diagrams

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                    http://server.com:9000                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              HTML/JavaScript Chatbot UI                    │ │
│  │  • Chat interface                                          │ │
│  │  • Sends questions via POST /chat                         │ │
│  │  • Displays results in table format                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP POST
                         │ JSON: {"message": "Show me all tables"}
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER (Port 9000)                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Node.js Web Server (web-server.js)             │  │
│  │  • Serves index.html at /                                │  │
│  │  • Routes:                                               │  │
│  │    - GET  /           → HTML page                        │  │
│  │    - GET  /health     → Status check                     │  │
│  │    - GET  /agent/info → System info                      │  │
│  │    - POST /tool/*     → Direct MCP calls                 │  │
│  │    - POST /chat       → AI-powered queries               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────┬──────────────────────┬─────────────────────────────────────┘
     │                      │
     │ POST /tool/*         │ POST /chat
     │ (Direct DB)          │ (AI Processing)
     │                      │
     ▼                      ▼
┌─────────────────┐   ┌──────────────────────────────────────────┐
│  MCP Server     │   │  VS Code + Copilot Bridge (Port 9001)    │
│  (Port 3000)    │   │                                          │
│                 │   │  ┌────────────────────────────────────┐  │
│  Python/FastAPI │   │  │  VS Code Extension                 │  │
│                 │   │  │  (Copilot Web Bridge)              │  │
│  8 DB Tools:    │   │  │                                    │  │
│  • query        │◄──┼──┤  • Receives user question          │  │
│  • execute      │   │  │  • Calls GitHub Copilot API        │  │
│  • list_tables  │   │  │  • Generates SQL query             │  │
│  • describe     │   │  │  • Calls MCP Server to execute     │  │
│  • indexes      │   │  │  • Formats response                │  │
│  • analyze      │   │  └────────────────────────────────────┘  │
│  • create_table │   │                                          │
│  • create_proc  │   │  Runs inside:                            │
│  └─────┬───────┘   │  • Xvfb virtual display (headless)       │
│        │           │  • or code-server (browser-based)        │
│        │           │  • or SSH X11 forwarding                 │
│        │           └──────────────────────────────────────────┘
│        │
│        ▼
│  ┌──────────────────┐
│  │   PostgreSQL     │
│  │   Database       │
│  │                  │
│  │  • Adventureworks│
│  │  • Port 5432/1   │
│  └──────────────────┘
└─────────────────────┘
```

## 2. Request Flow - AI Chat Query

```
┌──────────┐
│  USER    │
│  TYPES:  │  "Show me all employees"
│          │
└────┬─────┘
     │
     │ ① User enters question in browser
     ▼
┌─────────────────────────────────────┐
│   Browser (index.html)              │
│   Sends POST request:               │
│   http://server:9000/chat           │
│   Body: {"message": "Show..."}      │
└────┬────────────────────────────────┘
     │
     │ ② HTTP POST
     ▼
┌─────────────────────────────────────┐
│   Web Server (Node.js)              │
│   Receives request on /chat         │
│   Forwards to Copilot Bridge        │
└────┬────────────────────────────────┘
     │
     │ ③ Proxy to http://localhost:9001/chat
     ▼
┌─────────────────────────────────────────────────────┐
│   VS Code Extension (Copilot Web Bridge)            │
│                                                     │
│   ④ Sends prompt to GitHub Copilot:                │
│      "Generate SQL for: Show me all employees"     │
│      "Database has tables: employees, products..." │
└────┬────────────────────────────────────────────────┘
     │
     │ ⑤ API Call
     ▼
┌─────────────────────────────────────┐
│   GitHub Copilot (Cloud)            │
│   GPT-4 Model                       │
│   Generates:                        │
│   "SELECT * FROM employees LIMIT 100│
└────┬────────────────────────────────┘
     │
     │ ⑥ Returns SQL
     ▼
┌─────────────────────────────────────────────────────┐
│   VS Code Extension                                 │
│   Receives SQL from Copilot                         │
│   Calls MCP Server to execute:                      │
│   POST http://localhost:3000/mcp/v1/tools/call      │
│   {                                                 │
│     "name": "query_database",                       │
│     "arguments": {"query": "SELECT..."}             │
│   }                                                 │
└────┬────────────────────────────────────────────────┘
     │
     │ ⑦ Execute SQL
     ▼
┌─────────────────────────────────────┐
│   MCP Server (Python)               │
│   Executes query on database        │
└────┬────────────────────────────────┘
     │
     │ ⑧ SQL Query
     ▼
┌─────────────────────────────────────┐
│   PostgreSQL Database               │
│   Returns results:                  │
│   [                                 │
│     {id: 1, name: "John"},          │
│     {id: 2, name: "Jane"}           │
│   ]                                 │
└────┬────────────────────────────────┘
     │
     │ ⑨ Query results
     ▼
┌─────────────────────────────────────┐
│   MCP Server                        │
│   Returns JSON response             │
└────┬────────────────────────────────┘
     │
     │ ⑩ Results to Extension
     ▼
┌─────────────────────────────────────────────────────┐
│   VS Code Extension                                 │
│   Asks Copilot to explain results:                  │
│   "User asked for employees. Results show 2 rows... │
│   Explain this."                                    │
└────┬────────────────────────────────────────────────┘
     │
     │ ⑪ Request explanation
     ▼
┌─────────────────────────────────────┐
│   GitHub Copilot                    │
│   Returns:                          │
│   "Found 2 employees in database:   │
│    John and Jane"                   │
└────┬────────────────────────────────┘
     │
     │ ⑫ Explanation
     ▼
┌─────────────────────────────────────────────────────┐
│   VS Code Extension                                 │
│   Returns complete response:                        │
│   {                                                 │
│     "response": "Found 2 employees...",             │
│     "sql": "SELECT * FROM...",                      │
│     "data": [{id:1, name:"John"}...],              │
│     "rowCount": 2                                   │
│   }                                                 │
└────┬────────────────────────────────────────────────┘
     │
     │ ⑬ JSON response
     ▼
┌─────────────────────────────────────┐
│   Web Server                        │
│   Forwards response to browser      │
└────┬────────────────────────────────┘
     │
     │ ⑭ HTTP Response
     ▼
┌─────────────────────────────────────┐
│   Browser                           │
│   Displays:                         │
│   • Summary: "Found 2 employees..." │
│   • Table with data                 │
│   • SQL query (collapsible)         │
└─────────────────────────────────────┘
```

## 3. VS Code Headless Setup Flow (Linux)

```
┌──────────────────────────────────────────────────────────┐
│  LINUX SERVER WITHOUT DISPLAY                           │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  STEP 1: Install Xvfb (Virtual Display)                 │
│  $ sudo apt-get install xvfb                            │
│                                                          │
│  Creates virtual display in memory (no monitor needed)  │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  STEP 2: Start Xvfb                                     │
│  $ Xvfb :99 -screen 0 1024x768x24 &                     │
│                                                          │
│  • :99 = Display number                                 │
│  • 1024x768 = Virtual screen size                       │
│  • 24 = Color depth (bits)                              │
│  • & = Run in background                                │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  STEP 3: Set DISPLAY Environment Variable               │
│  $ export DISPLAY=:99                                   │
│                                                          │
│  Tells applications to use virtual display :99          │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  STEP 4: Start VS Code                                  │
│  $ code --no-sandbox /path/to/mcp-postgres              │
│                                                          │
│  VS Code thinks it has a display, but it's virtual      │
│  • GUI exists but not visible                           │
│  • Extensions work normally                             │
│  • GitHub Copilot API accessible                        │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  RESULT: VS Code Running Headless                       │
│                                                          │
│  Process Tree:                                          │
│  • Xvfb (PID 1234) - Virtual display                    │
│    └─ code (PID 1235) - VS Code main process            │
│       ├─ code-helper (GPU)                              │
│       ├─ code-helper (Renderer)                         │
│       └─ Extension Host                                 │
│          └─ Copilot Web Bridge Extension (Port 9001)    │
│                                                          │
│  Network:                                               │
│  • Port 9001 LISTENING (Copilot Bridge)                 │
│  • No GUI visible to user                               │
│  • HTTP API accessible                                  │
└──────────────────────────────────────────────────────────┘
```

## 4. Component Dependencies

```
┌─────────────────────────────────────────────────────────┐
│                    DEPENDENCY CHAIN                     │
└─────────────────────────────────────────────────────────┘

User Browser
    │
    │ depends on
    ▼
Web Server (Node.js - Port 9000)
    │
    ├─ depends on ─► MCP Server (Port 3000)
    │                   │
    │                   └─ depends on ─► PostgreSQL DB
    │
    └─ depends on ─► VS Code with Copilot Bridge (Port 9001)
                        │
                        ├─ depends on ─► Xvfb (Virtual Display)
                        │
                        ├─ depends on ─► GitHub Copilot Extension
                        │                    │
                        │                    └─ depends on ─► Internet
                        │                                       (Copilot API)
                        │
                        └─ depends on ─► MCP Server (Port 3000)

STARTUP ORDER:
1. PostgreSQL       (database first)
2. MCP Server       (connects to database)
3. Xvfb             (virtual display)
4. VS Code          (needs Xvfb)
5. Web Server       (needs MCP + Copilot Bridge)
```

## 5. Data Flow - Direct Tool Query (No AI)

```
User: "list tables"
      │
      │ ① Recognized as direct command
      ▼
┌──────────────────┐
│  Web Server      │
│  Detects keyword │
│  "list tables"   │
└────┬─────────────┘
     │
     │ ② POST /tool/list_tables
     ▼
┌──────────────────────────┐
│  MCP Server              │
│  /mcp/v1/tools/call      │
│  name: "list_tables"     │
└────┬─────────────────────┘
     │
     │ ③ SQL Query
     ▼
┌──────────────────────────┐
│  PostgreSQL              │
│  SELECT table_name       │
│  FROM information_schema │
└────┬─────────────────────┘
     │
     │ ④ Results
     ▼
┌──────────────────────────┐
│  MCP Server              │
│  Returns table list      │
└────┬─────────────────────┘
     │
     │ ⑤ JSON Response
     ▼
┌──────────────────────────┐
│  Web Server              │
│  Formats as table        │
└────┬─────────────────────┘
     │
     │ ⑥ Display
     ▼
Browser: Shows table with results

NOTE: Bypasses Copilot - faster for simple queries
```

## 6. Server Deployment Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      INTERNET                              │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       │ HTTPS (443)
                       ▼
┌──────────────────────────────────────────────────────────┐
│              NGINX Reverse Proxy (Optional)              │
│              https://your-domain.com                     │
│                                                          │
│  SSL Termination, Load Balancing, Security              │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ HTTP (localhost:9000)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    FIREWALL (UFW)                        │
│  • Allow 80/443 (public)                                 │
│  • Allow 9000 (from nginx only)                          │
│  • Deny 3000, 9001 (internal only)                       │
└──────────────────────┬───────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌─────────────────┐         ┌──────────────────────┐
│  Web Server     │         │  VS Code + Bridge    │
│  Port 9000      │◄────────┤  Port 9001           │
│  (Public)       │         │  (Internal)          │
│                 │         │                      │
│  systemd:       │         │  systemd:            │
│  chatbot-web    │         │  vscode-copilot      │
└────┬────────────┘         └──────────────────────┘
     │                               │
     │                               │
     ▼                               ▼
┌─────────────────┐         ┌──────────────────────┐
│  MCP Server     │         │  Xvfb Display :99    │
│  Port 3000      │         │  (Virtual)           │
│  (Internal)     │         │                      │
│                 │         │  systemd: xvfb       │
│  systemd:       │         └──────────────────────┘
│  mcp-server     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  PostgreSQL     │
│  Port 5432      │
│  (Internal)     │
│                 │
│  systemd:       │
│  postgresql     │
└─────────────────┘

ALL SERVICES AUTO-START ON BOOT VIA SYSTEMD
```

## 7. Port Usage Map

```
Port 80/443 (Public)
  ▲
  │ Nginx (optional)
  │
Port 9000 (Public - Main Entry Point)
  │
  ├─► Node.js Web Server
  │   • Serves HTML chatbot
  │   • Routes API requests
  │
  └─► Connects to:
      ├─► Port 9001 (Internal - Copilot Bridge)
      │   │
      │   └─► VS Code Extension
      │       • GitHub Copilot integration
      │       • SQL generation
      │       • Runs in Xvfb virtual display
      │
      └─► Port 3000 (Internal - MCP Server)
          │
          └─► PostgreSQL MCP Server
              • Database operations
              • 8 SQL tools
              │
              └─► Port 5432/5431 (Internal - Database)
                  │
                  └─► PostgreSQL Database

FIREWALL RULES:
• Port 80/443: ALLOW from anywhere (if using Nginx)
• Port 9000:   ALLOW from anywhere (or nginx only)
• Port 9001:   DENY from internet (localhost only)
• Port 3000:   DENY from internet (localhost only)
• Port 5432:   DENY from internet (localhost only)
```

## 8. Authentication & Security Flow

```
┌──────────────────────────────────────────────────────────┐
│  CURRENT STATE: No Authentication (Development)          │
└──────────────────────────────────────────────────────────┘

User → Web UI → Web Server → Copilot/MCP → Database
       (Open)    (Open)      (localhost)   (localhost)

RECOMMENDATION FOR PRODUCTION:
┌──────────────────────────────────────────────────────────┐
│  ADD AUTHENTICATION LAYER                                │
└──────────────────────────────────────────────────────────┘

User enters credentials
    │
    ▼
┌─────────────────┐
│  Login Page     │
│  (index.html)   │
└────┬────────────┘
     │
     │ POST /login {username, password}
     ▼
┌─────────────────────────┐
│  Web Server             │
│  Validates credentials  │
│  Issues JWT token       │
└────┬────────────────────┘
     │
     │ Returns JWT
     ▼
┌─────────────────────────┐
│  Browser                │
│  Stores JWT in cookie   │
└────┬────────────────────┘
     │
     │ All future requests include JWT
     ▼
┌─────────────────────────┐
│  Web Server             │
│  Validates JWT          │
│  If valid → process     │
│  If invalid → reject    │
└─────────────────────────┘

SECURITY LAYERS:
1. HTTPS (SSL) - Encrypt traffic
2. JWT/Sessions - User authentication
3. Firewall - Block internal ports
4. DB User - Read-only permissions
5. Rate Limiting - Prevent abuse
```

This comprehensive documentation covers all aspects of the architecture and setup!