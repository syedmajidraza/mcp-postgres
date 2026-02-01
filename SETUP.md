# PostgreSQL Chatbot with GitHub Copilot - Setup Guide

Query your PostgreSQL database using natural language through a web interface powered by GitHub Copilot.

## Architecture

```
Web Browser → VS Code Extension → GitHub Copilot (GPT-4) → MCP Server → PostgreSQL
     ↓              ↓                      ↓                    ↓            ↓
localhost:9000  Middleware          Natural Language        Tools      Database
   (HTML)      (Port 9000)           SQL Generation      (Port 3000)  (Port 5431)
```

## Prerequisites

✅ **VS Code** installed
✅ **GitHub Copilot** subscription active
✅ **PostgreSQL** database running
✅ **Python 3.9+** installed
✅ **Node.js 20+** installed (for building extension)

---

## Installation Steps

### Step 1: Install PostgreSQL MCP Server Dependencies

**macOS / Linux:**
```bash
cd mcp-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Windows:**
```batch
cd mcp-server
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

### Step 2: Configure Database Connection

Create your `.env` file from the example template:

**macOS / Linux:**
```bash
cd mcp-server
cp .env.example .env
nano .env
```

**Windows:**
```batch
cd mcp-server
copy .env.example .env
notepad .env
```

Update the values in `.env` with your database credentials:
```
DB_HOST=localhost
DB_PORT=5431
DB_NAME=Adventureworks
DB_USER=postgres
DB_PASSWORD=postgres
```

### Step 3: Install VS Code Extension

```bash
code --install-extension copilot-web-bridge/copilot-web-bridge-1.0.0.vsix
```

### Step 4: Configure Extension (Optional)

Open VS Code Settings (`Cmd+,` or `Ctrl+,`) and search for "Copilot Web Bridge":

- **Port**: `9000` (default)
- **MCP Server URL**: `http://localhost:3000` (default)
- **Auto Start**: `true` (recommended)

---

## Running the Application

### Option A: Start All Services at Once

**macOS / Linux:**
```bash
./start-all.sh
```

**Windows:**
```batch
start-all.bat
```

This starts everything automatically and opens the chatbot in your browser.

### Option B: Start Services Individually

#### Start MCP Server

**macOS / Linux:**
```bash
cd mcp-server
source venv/bin/activate
python3 server.py
```

**Windows:**
```batch
cd mcp-server
venv\Scripts\activate.bat
python server.py
```

You should see:
```
Connected to PostgreSQL database: Adventureworks
INFO:     Uvicorn running on http://0.0.0.0:3000
```

#### Start VS Code Extension

1. **Open VS Code**
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
3. Type: `Developer: Reload Window`
4. Wait for extension to auto-start (if `autoStart: true`)

**OR manually start:**

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type: `Copilot Web Bridge: Start Server`
3. You'll see: **"Copilot Web Bridge started on http://localhost:9000"**

#### Start Web Server

```bash
node web-server.js
```

#### Open Web Chatbot

**macOS:**
```bash
open http://localhost:9000
```

**Windows:**
```batch
start http://localhost:9000
```

Or navigate to `http://localhost:9000` in your browser.

---

## Using the Chatbot

**Example Queries:**

- "Show me all tables"
- "List all employees"
- "What is the average salary by department?"
- "Show me the top 5 highest paid employees"
- "How many products have ratings above 4?"

**The chatbot will:**
1. Generate SQL query using GitHub Copilot
2. Execute query on your database
3. Display results in formatted table
4. Show brief summary

---

## Verification

### Check MCP Server

```bash
curl http://localhost:3000/health
```

Expected output:
```json
{
  "status": "running",
  "database": "connected",
  "config": {
    "host": "localhost",
    "port": 5431,
    "database": "Adventureworks"
  }
}
```

### Check Copilot Web Bridge

```bash
curl http://localhost:9000/health
```

Expected output:
```json
{
  "status": "ok",
  "copilotEnabled": true
}
```

### Check Extension Status

In VS Code:
- Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
- Type: `Copilot Web Bridge: Show Status`
- Should show: "running on port 9000"

---

## Troubleshooting

### Web page shows "Connection Error"

**Problem:** Cannot connect to port 9000
**Solution:**
1. Verify VS Code is running
2. Run command: `Copilot Web Bridge: Start Server`
3. Check extension output: View → Output → "Copilot Web Bridge"

### "GitHub Copilot not available"

**Problem:** GitHub Copilot not authenticated
**Solution:**
1. Click GitHub Copilot icon in VS Code status bar
2. Sign in to GitHub Copilot
3. Verify subscription is active
4. Restart VS Code extension

### "MCP Server error: Internal Server Error"

**Problem:** MCP server not running or database error
**Solution:**
1. Check MCP server is running: `curl http://localhost:3000/health`
2. Check database connection in `mcp-server/.env`
3. View MCP server logs:
   - macOS/Linux: `tail -f /tmp/mcp-server.log`
   - Windows: `type %TEMP%\mcp-server.log`
4. Restart MCP server

### Database connection failed

**Problem:** Cannot connect to PostgreSQL
**Solution:**
1. Verify PostgreSQL is running
2. Check connection details in `mcp-server/.env`
3. Test connection: `psql -h localhost -p 5431 -U postgres -d Adventureworks`

---

## Important Notes

⚠️ **VS Code must remain open** - The extension runs inside VS Code. If you close VS Code, the web chatbot stops working.

⚠️ **GitHub Copilot required** - This solution uses GitHub Copilot's LLM. You need an active subscription.

⚠️ **Local only** - The web bridge only accepts connections from localhost for security.

---

## File Structure

```
postgres-mcp/
├── index.html                          # Web chatbot interface
├── copilot-web-bridge/                 # VS Code extension
│   ├── copilot-web-bridge-1.0.0.vsix  # Extension package
│   └── src/extension.ts                # Extension source code
├── mcp-server/                         # PostgreSQL MCP Server
│   ├── server.py                       # FastAPI HTTP server
│   ├── stdio_server.py                 # Stdio server (for VS Code direct integration)
│   └── config.py                       # Database configuration
└── SETUP.md                            # This file
```

---

## Technical Details

### GitHub Copilot Integration

The VS Code extension uses the `vscode.lm` API to communicate with GitHub Copilot:

```typescript
const copilot = await vscode.lm.selectChatModels({ family: 'gpt-4' });
const model = copilot[0];
const response = await model.sendRequest(messages, {}, token);
```

### MCP Tools Available

- `query_database` - Execute SELECT queries
- `execute_sql` - Execute INSERT/UPDATE/DELETE
- `list_tables` - List all tables in schema
- `describe_table` - Get table structure
- `get_table_indexes` - List table indexes
- `analyze_query_plan` - EXPLAIN query execution
- `create_table` - Create new tables
- `create_stored_procedure` - Create stored procedures

### Security

- Extension only binds to `localhost` (127.0.0.1)
- CORS enabled for local development only
- Database credentials stored locally in `config.py`
- No data sent to external services except GitHub Copilot API

---

## Stopping Services

### Stop All Services at Once

**macOS / Linux:**
```bash
./stop-all.sh
```

**Windows:**
```batch
stop-all.bat
```

### Stop Services Individually

**Stop MCP Server:**

macOS / Linux:
```bash
pkill -f "python3 server.py"
```

Windows:
```batch
taskkill /F /IM python.exe
```

**Stop VS Code Extension:**

In VS Code:
- Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
- Type: `Copilot Web Bridge: Stop Server`

---

## Support

For issues or questions:
1. Check extension output: View → Output → "Copilot Web Bridge"
2. Check MCP server logs:
   - macOS/Linux: `tail -f /tmp/mcp-server.log`
   - Windows: `type %TEMP%\mcp-server.log`
3. Review this guide's Troubleshooting section

---

**Enjoy querying your database with natural language! 🎉**
