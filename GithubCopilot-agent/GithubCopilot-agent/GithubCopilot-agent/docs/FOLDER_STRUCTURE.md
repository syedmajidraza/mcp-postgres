# PostgreSQL MCP - Folder Structure Reference

## 📁 Project Overview

This project consists of three main folders that work together to provide natural language SQL queries in VS Code.

```
/Users/syedraza/postgres-mcp/
├── mcp-server/              # Backend: Database server
├── vscode-extension/        # Frontend: VS Code extension
└── postgres-mcp-package/    # Distribution: Installation package
```

---

## 1️⃣ `mcp-server/` - The Backend Database Server

### **Purpose**
The MCP (Model Context Protocol) server is a FastAPI backend that connects to PostgreSQL and executes SQL queries.

### **What It Does**
- Runs as a web server on `http://127.0.0.1:3000`
- Connects to PostgreSQL database
- Provides 8 MCP tools (REST API endpoints) for database operations
- Executes SQL queries and returns results
- Manages database connections via connection pool

### **Folder Structure**
```
mcp-server/
├── server.py              # Main FastAPI server with MCP endpoints
├── config.py              # Database configuration loader
├── requirements.txt       # Python dependencies (FastAPI, asyncpg, etc.)
├── .env.example          # Example database configuration
├── .env                  # Actual database credentials (git-ignored)
└── venv/                 # Python virtual environment (auto-created)
```

### **Key Files**

**`server.py`** (Main Server)
- FastAPI application
- 8 MCP tool endpoints:
  - `list_tables` - Get all tables
  - `describe_table` - Get table schema
  - `query_database` - Execute SELECT queries
  - `execute_sql` - Execute INSERT/UPDATE/DELETE/CREATE
  - `create_table` - Create new tables
  - `create_stored_procedure` - Create functions/procedures
  - `get_table_indexes` - Get table indexes
  - `analyze_query_plan` - Explain query execution plans
- `/health` endpoint for status checks
- `/configure` endpoint for runtime config updates

**`config.py`** (Configuration Manager)
- Loads environment variables from `.env`
- Provides configuration class
- Manages database connection settings

**`requirements.txt`** (Dependencies)
```
fastapi==0.115.0
uvicorn[standard]==0.32.0
asyncpg==0.29.0
pydantic==2.9.2
python-dotenv==1.0.1
```

**`.env`** (Database Credentials)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=postgres
DB_PASSWORD=your_password

SERVER_HOST=127.0.0.1
SERVER_PORT=3000

POOL_MIN_SIZE=2
POOL_MAX_SIZE=10
```

### **How It Runs**

**Manual Start:**
```bash
cd mcp-server
source venv/bin/activate  # Windows: venv\Scripts\activate
python server.py
```

**Automatic Start:**
- VS Code extension can start/stop it
- Auto-starts if `postgresMcp.server.autoStart: true`

**Installation Location:**
- Development: `/Users/syedraza/postgres-mcp/mcp-server/`
- Production: `~/.postgres-mcp/mcp-server/` (after installation)

### **API Endpoints**

**Health Check:**
```bash
GET http://127.0.0.1:3000/health
```
Response:
```json
{
  "status": "running",
  "database": "connected",
  "config": {
    "host": "localhost",
    "port": 5432,
    "database": "Adventureworks"
  }
}
```

**List Tools:**
```bash
GET http://127.0.0.1:3000/mcp/v1/tools
```

**Execute Tool:**
```bash
POST http://127.0.0.1:3000/mcp/v1/tools/call
Content-Type: application/json

{
  "name": "query_database",
  "arguments": {
    "query": "SELECT * FROM employees LIMIT 5"
  }
}
```

---

## 2️⃣ `vscode-extension/` - The Frontend VS Code Extension

### **Purpose**
VS Code extension that provides the `@postgres` chat participant in GitHub Copilot and manages the MCP server.

### **What It Does**
- Registers `@postgres` in Copilot Chat
- Uses GitHub Copilot's LLM to convert natural language to SQL
- Manages MCP server (start/stop/status/restart)
- Sends SQL queries to MCP server
- Displays results in Copilot Chat
- Shows status in VS Code status bar

### **Folder Structure**
```
vscode-extension/
├── src/
│   └── extension.ts                    # Main extension code
├── out/                                # Compiled JavaScript (auto-generated)
│   └── extension.js
├── node_modules/                       # npm dependencies (auto-generated)
├── package.json                        # Extension manifest & configuration
├── tsconfig.json                       # TypeScript compiler config
├── README.md                           # Extension documentation
└── postgres-mcp-copilot-1.0.0.vsix    # Packaged extension file
```

### **Key Files**

**`src/extension.ts`** (Main Extension Code - 460 lines)

**Core Functions:**
- `activate()` - Extension entry point
- `startMcpServer()` - Starts the MCP server process
- `stopMcpServer()` - Stops the MCP server
- `checkServerHealth()` - Checks if server is running
- `handleChatRequest()` - Handles `@postgres` requests

**LLM Integration:**
- `generateSQLWithLLM()` - **Key function** that uses Copilot LLM
  - Fetches database schema from MCP server
  - Sends to GitHub Copilot's GPT-4 model
  - Returns generated SQL

**Request Handlers:**
- `handleGeneralRequest()` - Natural language queries
- `handleQueryRequest()` - Direct SQL queries
- `handleListTablesRequest()` - List tables
- `handleDescribeTableRequest()` - Describe table structure
- `handleCreateRequest()` - Create database objects

**Helper Functions:**
- `findMcpServerPath()` - Locates MCP server installation
- `updateStatusBar()` - Updates VS Code status bar
- `formatAsTable()` - Formats query results as table

**`package.json`** (Extension Manifest)
```json
{
  "name": "postgres-mcp-copilot",
  "displayName": "Syed PostgreSQL MCP for GitHub Copilot",
  "version": "1.0.0",
  "publisher": "syedraza",
  "engines": {
    "vscode": "^1.85.0"
  },
  "contributes": {
    "commands": [...],      // VS Code commands
    "chatParticipants": [...], // @postgres participant
    "configuration": {...}  // Extension settings
  }
}
```

**Commands Provided:**
- `PostgreSQL MCP: Start Server`
- `PostgreSQL MCP: Stop Server`
- `PostgreSQL MCP: Restart Server`
- `PostgreSQL MCP: Show Server Status`
- `PostgreSQL MCP: Configure Database Connection`

**Settings:**
```json
{
  "postgresMcp.database.host": "localhost",
  "postgresMcp.database.port": 5432,
  "postgresMcp.database.name": "your_db",
  "postgresMcp.database.user": "postgres",
  "postgresMcp.database.password": "",
  "postgresMcp.server.port": 3000,
  "postgresMcp.server.autoStart": true,
  "postgresMcp.pythonPath": "python3"
}
```

**`.vsix` File:**
- Packaged extension ready for installation
- Created by: `npm run package`
- Install via: Extensions → Install from VSIX

### **How It Works**

**Development:**
```bash
cd vscode-extension
npm install           # Install dependencies
npm run compile       # Compile TypeScript to JavaScript
npm run watch         # Watch mode for development
npm run package       # Create .vsix file
```

**Installation:**
1. Open VS Code
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Type: `Extensions: Install from VSIX`
4. Select: `postgres-mcp-copilot-1.0.0.vsix`
5. Reload window

**Usage:**
```
@postgres show tables
@postgres How many employees earn over 70000?
@postgres Create a table for product reviews
```

### **LLM Communication Flow**

```typescript
// 1. User types: @postgres minimum salary of employees

// 2. Extension fetches database schema
const tablesResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
    name: 'list_tables',
    arguments: { schema: 'public' }
});

// 3. Connects to GitHub Copilot LLM
const models = await vscode.lm.selectChatModels({
    vendor: 'copilot',
    family: 'gpt-4'
});

// 4. Sends context to Copilot
const systemPrompt = `You are a PostgreSQL expert.
Available Schema: employees (employeeid integer, salary numeric...)
User Request: "minimum salary of employees"
Generate SQL:`;

const chatResponse = await model.sendRequest(messages);

// 5. Receives SQL: "SELECT MIN(salary) FROM employees"

// 6. Executes via MCP server
const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
    name: 'query_database',
    arguments: { query: sqlQuery }
});

// 7. Shows results in Copilot Chat
```

---

## 3️⃣ `postgres-mcp-package/` - Distribution Package

### **Purpose**
Auto-generated distribution package for deploying to developers. Contains everything needed for installation.

### **What It Contains**
```
postgres-mcp-package/
├── mcp-server/                         # Copy of MCP server
│   ├── server.py
│   ├── config.py
│   ├── requirements.txt
│   └── .env.example
├── postgres-mcp-copilot-1.0.0.vsix    # VS Code extension
├── docs/                               # Documentation
│   ├── DEVELOPER_QUICK_START.md
│   ├── USAGE_EXAMPLES.md
│   ├── LLM_ENHANCED_GUIDE.md
│   ├── TESTING_GUIDE.md
│   └── IMPLEMENTATION_SUMMARY.md
├── install.sh                          # Installation script (macOS/Linux)
├── install.ps1                         # Installation script (Windows)
├── README.md                           # Installation instructions
└── VERSION                             # Version information
```

### **How It's Created**

```bash
./create-package.sh
```

This script:
1. Creates `postgres-mcp-package/` folder
2. Copies `mcp-server/` (excludes venv, __pycache__, .env)
3. Copies VS Code extension `.vsix` file
4. Copies documentation to `docs/`
5. Creates installation scripts (`install.sh`, `install.ps1`)
6. Creates README and VERSION files
7. Creates tarball: `postgres-mcp-v1.0.0.tar.gz`

### **Installation Scripts**

**`install.sh` (macOS/Linux)**
```bash
#!/bin/bash
# Installs MCP server to ~/.postgres-mcp/

INSTALL_DIR="${HOME}/.postgres-mcp"
mkdir -p $INSTALL_DIR

# Copy MCP server
cp -r mcp-server $INSTALL_DIR/
cd $INSTALL_DIR/mcp-server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

**`install.ps1` (Windows)**
```powershell
# PowerShell installation script
# Same functionality as install.sh but for Windows
```

### **Distribution Package Usage**

**For DevOps:**
```bash
# Create package
./create-package.sh

# Distribute via:
# 1. Network share
cp postgres-mcp-v1.0.0.tar.gz /network/share/

# 2. Web server
scp postgres-mcp-v1.0.0.tar.gz user@server:/var/www/tools/

# 3. Git repository
tar -xzf postgres-mcp-v1.0.0.tar.gz
cd postgres-mcp-package
git init && git add . && git commit -m "v1.0.0"
```

**For Developers:**
```bash
# Download and extract
tar -xzf postgres-mcp-v1.0.0.tar.gz
cd postgres-mcp-package

# Run installer
./install.sh

# Configure database
nano ~/.postgres-mcp/mcp-server/.env

# Install VS Code extension
# Cmd+Shift+P → Install from VSIX → select .vsix file
```

---

## 🔄 How The Three Folders Work Together

### **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Developer's Machine                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      VS Code                                │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Extension (vscode-extension/)                       │  │ │
│  │  │  - Installed from .vsix file                         │  │ │
│  │  │  - Provides @postgres chat participant              │  │ │
│  │  │  - Uses GitHub Copilot LLM (vscode.lm API)          │  │ │
│  │  │  - Manages MCP server lifecycle                      │  │ │
│  │  │  - Shows status in status bar                        │  │ │
│  │  └──────────────────┬───────────────────────────────────┘  │ │
│  └─────────────────────┼──────────────────────────────────────┘ │
│                        │                                         │
│                        │ HTTP Requests                           │
│                        │ POST http://127.0.0.1:3000/mcp/v1/...  │
│                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  MCP Server (mcp-server/)                                   ││
│  │  - Installed at ~/.postgres-mcp/mcp-server/                 ││
│  │  - Running as Python FastAPI server                         ││
│  │  - Listens on http://127.0.0.1:3000                         ││
│  │  - Provides 8 MCP tools (REST endpoints)                    ││
│  │  - Executes SQL queries via asyncpg                         ││
│  └──────────────────────┬──────────────────────────────────────┘│
│                         │                                        │
│                         │ PostgreSQL Protocol (asyncpg)          │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  PostgreSQL Database │
               │  (Company Database)  │
               └──────────────────────┘
```

### **Request Flow Example**

**User types:** `@postgres How many employees earn over 70000?`

**Step-by-step:**

1. **VS Code Extension (vscode-extension/)**
   - Chat participant receives request
   - Checks if MCP server is running
   - Calls `generateSQLWithLLM()`

2. **Fetch Database Schema**
   ```
   Extension → MCP Server
   POST http://127.0.0.1:3000/mcp/v1/tools/call
   { name: "list_tables", arguments: { schema: "public" } }

   MCP Server → PostgreSQL → Returns: employees, suppliers

   Extension → MCP Server (for each table)
   POST http://127.0.0.1:3000/mcp/v1/tools/call
   { name: "describe_table", arguments: { table_name: "employees" } }

   Returns: employeeid (integer), firstname (varchar), salary (numeric)...
   ```

3. **Call GitHub Copilot LLM**
   ```typescript
   Extension → GitHub Copilot (via vscode.lm)
   Prompt: "You are a PostgreSQL expert.
           Schema: employees (employeeid integer, salary numeric...)
           User: How many employees earn over 70000?
           Generate SQL:"

   Copilot LLM → Extension
   Returns: "SELECT COUNT(*) FROM employees WHERE salary > 70000"
   ```

4. **Execute SQL**
   ```
   Extension → MCP Server
   POST http://127.0.0.1:3000/mcp/v1/tools/call
   { name: "query_database", arguments: { query: "SELECT COUNT(*) FROM employees WHERE salary > 70000" } }

   MCP Server → PostgreSQL → Executes query
   PostgreSQL → MCP Server → Returns: { count: 1 }
   MCP Server → Extension → Returns formatted result
   ```

5. **Display Results**
   ```
   Extension shows in Copilot Chat:

   🤖 Analyzing your request and generating SQL...

   Generated SQL:
   ```sql
   SELECT COUNT(*) FROM employees WHERE salary > 70000
   ```

   Results: 1 rows
   count
   -----
   1
   ```

---

## 📊 Comparison: Development vs Production

### **Development Environment (Your Setup)**

```
/Users/syedraza/postgres-mcp/
├── mcp-server/              # Source code - edit here
│   ├── server.py
│   ├── config.py
│   ├── .env                 # Your DB credentials
│   └── venv/
├── vscode-extension/        # Source code - edit here
│   ├── src/extension.ts
│   └── postgres-mcp-copilot-1.0.0.vsix
└── postgres-mcp-package/    # Auto-generated - don't edit
    └── (created by create-package.sh)
```

**Workflow:**
1. Edit code in `mcp-server/` or `vscode-extension/`
2. Test locally
3. Run `./create-package.sh` to create distribution
4. Share `postgres-mcp-v1.0.0.tar.gz`

### **Production Environment (Developer's Setup)**

```
~/.postgres-mcp/
└── mcp-server/              # Installed from package
    ├── server.py
    ├── config.py
    ├── .env                 # Their DB credentials
    └── venv/

~/.vscode/extensions/
└── postgres-mcp-copilot-1.0.0/  # Installed from .vsix
    ├── out/extension.js
    └── package.json
```

**Workflow:**
1. Download `postgres-mcp-v1.0.0.tar.gz`
2. Run `./install.sh`
3. Configure `.env` with their database
4. Install `.vsix` in VS Code
5. Use `@postgres` in Copilot Chat

---

## 🔧 Making Changes & Updates

### **⚠️ IMPORTANT: Never Edit `postgres-mcp-package/` Directly!**

The `postgres-mcp-package/` folder is **auto-generated**. Any manual changes will be lost when you run `./create-package.sh`.

**Golden Rule:**
```
Edit source code → Run ./create-package.sh → Package updates automatically ✅
```

---

### **Automated Update Workflow**

**The `create-package.sh` script does everything for you automatically:**

```bash
./create-package.sh
```

**What it does:**
1. ✅ Deletes old `postgres-mcp-package/` folder
2. ✅ Creates fresh `postgres-mcp-package/` folder
3. ✅ Copies latest `mcp-server/` files (excludes venv, .env, __pycache__)
4. ✅ Copies latest `vscode-extension/*.vsix` file
5. ✅ Copies all documentation to `docs/`
6. ✅ Creates installation scripts (`install.sh`, `install.ps1`)
7. ✅ Creates README and VERSION files
8. ✅ Creates `postgres-mcp-v1.0.0.tar.gz` distribution tarball

**You never need to manually copy files!**

---

### **Scenario 1: Update MCP Server**

```bash
# 1. Edit source code
nano mcp-server/server.py

# 2. Test locally
cd mcp-server
source venv/bin/activate
python server.py
# Test: curl http://127.0.0.1:3000/health

# 3. Rebuild package (AUTOMATIC)
cd ..
./create-package.sh

# ✅ Done! postgres-mcp-package/ now has your latest changes
```

---

### **Scenario 2: Update VS Code Extension**

```bash
# 1. Edit source code
nano vscode-extension/src/extension.ts

# 2. Compile TypeScript
cd vscode-extension
npm run compile

# 3. Test in VS Code (optional)
# Press F5 to launch Extension Development Host
# Test @postgres commands

# 4. Package extension (creates new .vsix)
npm run package

# 5. Rebuild distribution package (AUTOMATIC)
cd ..
./create-package.sh

# ✅ Done! postgres-mcp-package/ now has your new .vsix
```

---

### **Scenario 3: Update Both Server and Extension**

```bash
# 1. Edit both
nano mcp-server/server.py
nano vscode-extension/src/extension.ts

# 2. Compile extension
cd vscode-extension
npm run compile
npm run package

# 3. Rebuild package (gets BOTH changes automatically)
cd ..
./create-package.sh

# ✅ Done! postgres-mcp-package/ has all latest changes
```

---

### **Scenario 4: Update Documentation Only**

```bash
# 1. Edit documentation
nano DEVELOPER_QUICK_START.md
nano USAGE_EXAMPLES.md

# 2. Rebuild package (AUTOMATIC)
./create-package.sh

# ✅ Done! Updated docs are in postgres-mcp-package/docs/
```

---

### **Version Management**

**When releasing a new version:**

```bash
# 1. Update version number
nano vscode-extension/package.json
# Change: "version": "1.0.0" → "1.1.0"

# 2. Compile and package extension
cd vscode-extension
npm run compile
npm run package  # Creates postgres-mcp-copilot-1.1.0.vsix

# 3. (Optional) Update version in create-package.sh
nano create-package.sh
# Change tar filename if you want: postgres-mcp-v1.1.0.tar.gz

# 4. Rebuild package (AUTOMATIC)
cd ..
./create-package.sh

# ✅ Done! New version packaged and ready
```

---

### **Development Best Practices**

**Use Watch Mode for Extension Development:**

```bash
cd vscode-extension
npm run watch  # Auto-compiles on every save
```

Then in VS Code:
- Press `F5` to launch Extension Development Host
- Edit code, see changes instantly
- When ready to distribute: `npm run package` → `../create-package.sh`

**Test Before Packaging:**

```bash
# Test MCP server
cd mcp-server
source venv/bin/activate
python server.py
# Open: http://127.0.0.1:3000/health

# Test extension
cd vscode-extension
# Press F5 in VS Code
# Try @postgres commands in Copilot Chat

# If both work, package it
cd ..
./create-package.sh
```

---

### **What Happens Behind the Scenes**

**When you run `./create-package.sh`:**

```
Step 1: Clean up
rm -rf postgres-mcp-package

Step 2: Create structure
mkdir -p postgres-mcp-package/docs

Step 3: Copy MCP server
cp -r mcp-server postgres-mcp-package/
# Automatically excludes:
#   - venv/
#   - __pycache__/
#   - .env (your credentials stay private!)

Step 4: Copy VS Code extension
cp vscode-extension/*.vsix postgres-mcp-package/

Step 5: Copy documentation
cp DEVELOPER_QUICK_START.md postgres-mcp-package/docs/
cp USAGE_EXAMPLES.md postgres-mcp-package/docs/
# ... and all other docs

Step 6: Generate install scripts
# Creates install.sh and install.ps1 automatically

Step 7: Create tarball
tar -czf postgres-mcp-v1.0.0.tar.gz postgres-mcp-package/

✅ Result: Fresh package with all your latest changes!
```

---

### **Quick Reference: Update Workflow**

| What You Changed | Steps |
|------------------|-------|
| **MCP Server** | Edit `mcp-server/` → `./create-package.sh` |
| **Extension** | Edit `vscode-extension/` → `npm run compile` → `npm run package` → `./create-package.sh` |
| **Documentation** | Edit `*.md` files → `./create-package.sh` |
| **Version** | Update `package.json` → `npm run package` → `./create-package.sh` |
| **Everything** | Make all changes → `npm run package` (if extension changed) → `./create-package.sh` |

**Distribution:**
```bash
# After running create-package.sh, you get:
postgres-mcp-v1.0.0.tar.gz  # ← Share this file with developers!
```

---

### **Common Mistakes to Avoid**

❌ **Don't do this:**
```bash
# DON'T manually edit files in postgres-mcp-package/
nano postgres-mcp-package/mcp-server/server.py  # ❌ WRONG!
# Changes will be lost when you run create-package.sh
```

✅ **Do this instead:**
```bash
# Edit source files
nano mcp-server/server.py  # ✅ CORRECT!
./create-package.sh        # Copies changes to package automatically
```

❌ **Don't do this:**
```bash
# DON'T manually copy files
cp mcp-server/server.py postgres-mcp-package/mcp-server/  # ❌ WRONG!
```

✅ **Do this instead:**
```bash
# Let the script do it
./create-package.sh  # ✅ CORRECT! Copies everything automatically
```

---

## 📝 Quick Reference

| Folder | Purpose | Technology | Runs Where |
|--------|---------|------------|------------|
| **mcp-server/** | Database backend | Python/FastAPI | Local port 3000 |
| **vscode-extension/** | VS Code UI | TypeScript | Inside VS Code |
| **postgres-mcp-package/** | Distribution | Bash/PowerShell | Installation only |

**Key Technologies:**
- **Backend:** Python 3.8+, FastAPI, asyncpg, PostgreSQL
- **Frontend:** TypeScript, VS Code Extension API, vscode.lm (Copilot)
- **Communication:** REST API (JSON over HTTP)
- **AI:** GitHub Copilot GPT-4 (via vscode.lm)

**Key APIs Used:**
- `vscode.chat.createChatParticipant()` - Creates @postgres participant
- `vscode.lm.selectChatModels()` - Access Copilot LLM
- `vscode.commands.registerCommand()` - Register VS Code commands
- `vscode.StatusBarItem` - Show status in VS Code status bar
- FastAPI REST endpoints - MCP tools

---

## ✅ Summary

**Three folders, one system:**

1. **`mcp-server/`** = Backend (connects to PostgreSQL, executes SQL)
2. **`vscode-extension/`** = Frontend (VS Code interface, uses Copilot LLM)
3. **`postgres-mcp-package/`** = Distribution (packages 1 & 2 for easy installation)

**Flow:**
```
Developer types @postgres → Extension uses Copilot LLM → Generates SQL →
MCP Server executes → PostgreSQL returns data → Extension shows results
```

**All powered by GitHub Copilot's AI for natural language understanding! 🚀**
