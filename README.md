# PostgreSQL Chatbot with GitHub Copilot

Query your PostgreSQL database using natural language through a web interface powered by GitHub Copilot.

![PostgreSQL AI Assistant](docs/screenshot-ui.png)

*Web interface showing VS Code Copilot Bridge connection with GPT-4 model*

---

## 🚀 Quick Start

**macOS / Linux:**
```bash
./start-all.sh
```

**Windows:**
```batch
start-all.bat
```

This will:
1. Start MCP Server (port 3000)
2. Start VS Code + Copilot Bridge (port 9001) - minimized in background
3. Start Web Server (port 9000)
4. Open chatbot in your browser at http://localhost:9000

**To stop all services:**

macOS / Linux:
```bash
./stop-all.sh
```

Windows:
```batch
stop-all.bat
```

---

## Features

![PostgreSQL AI Assistant Interface](docs/feature.png)

| Feature | Description |
|---------|-------------|
| **Natural Language Queries** | Ask questions in plain English |
| **GitHub Copilot GPT-4** | Powered by GPT-4 via VS Code Copilot Bridge |
| **Real-time Status** | Shows connection status and model info |
| **Table Visualization** | Results displayed in formatted tables |
| **SQL Transparency** | View generated SQL queries |
| **Quick Actions** | Pre-built buttons for common queries |

---

## Architecture

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌────────────┐
│   Browser   │───▶│   Web Server    │───▶│  VS Code        │───▶│    MCP     │───▶ PostgreSQL
│  (port 9000)│    │   (Node.js)     │    │  Copilot Bridge │    │   Server   │
└─────────────┘    └─────────────────┘    │  (GPT-4)        │    │ (port 3000)│
                                          └─────────────────┘    └────────────┘
```

**Components:**
| Component | Port | Description |
|-----------|------|-------------|
| Web Server | 9000 | Serves chatbot UI |
| Copilot Bridge | 9001 | VS Code extension connecting to GitHub Copilot |
| MCP Server | 3000 | PostgreSQL database connector |

---

## Requirements

- VS Code installed
- GitHub Copilot subscription (active)
- PostgreSQL database
- Python 3.9+
- Node.js

---

## Installation

### macOS / Linux

1. **Install Python dependencies:**
   ```bash
   cd mcp-server
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure database:**
   ```bash
   cp .env.example .env
   nano mcp-server/.env   # Edit with your database credentials
   ```

3. **Install VS Code extension:**
   ```bash
   code --install-extension copilot-web-bridge/copilot-web-bridge-1.0.0.vsix
   ```

4. **Start:**
   ```bash
   ./start-all.sh
   ```

### Windows

1. **Install Python dependencies:**
   ```batch
   cd mcp-server
   python -m venv venv
   venv\Scripts\activate.bat
   pip install -r requirements.txt
   ```

2. **Configure database:**
   ```batch
   copy .env.example .env
   notepad mcp-server\.env   &REM Edit with your database credentials
   ```

3. **Install VS Code extension:**
   ```batch
   code --install-extension copilot-web-bridge\copilot-web-bridge-1.0.0.vsix
   ```

4. **Start:**
   ```batch
   start-all.bat
   ```

---

## Example Queries

```
"Show me all tables"
"List employees with salary above 70000"
"What is the average salary by department?"
"Show me the top 5 highest rated products"
"Describe the employees table"
```

---

## How It Works

1. User types question in browser
2. Request sent to VS Code Copilot Bridge
3. GitHub Copilot (GPT-4) generates SQL
4. MCP Server executes SQL on PostgreSQL
5. Results displayed with AI-generated summary

---

## Database Tools

The MCP server provides these tools:

| Tool | Description |
|------|-------------|
| `query_database` | Execute SELECT queries |
| `execute_sql` | Run INSERT/UPDATE/DELETE |
| `list_tables` | List all tables |
| `describe_table` | Get table structure |
| `get_table_indexes` | View indexes |
| `analyze_query_plan` | EXPLAIN queries |
| `create_table` | Create new tables |
| `create_stored_procedure` | Create procedures |

---

## Important Notes

| Note | Details |
|------|---------|
| **VS Code Required** | Must stay running (minimized is fine) |
| **GitHub Copilot** | Active subscription required |
| **Local Only** | Web interface works on localhost |

**Why VS Code is required:** GitHub Copilot API is only accessible through VS Code's `vscode.lm` API. There is no standalone Copilot API available.

---

## Troubleshooting

**Chatbot not connecting?**
```bash
# Check all services are running
curl http://localhost:9000/health
curl http://localhost:9001/health
curl http://localhost:3000/health
```

**VS Code Copilot Bridge disconnected?**
- Make sure VS Code is running (can be minimized)
- Check GitHub Copilot is signed in
- Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) and run "Copilot Web Bridge: Start Server"

**Database errors?**
- Verify `mcp-server/.env` has correct credentials
- Check PostgreSQL is running

**Windows-specific issues?**
- Make sure `python` and `node` are in your system PATH
- Make sure `curl` is available (included in Windows 10+)
- Run `start-all.bat` from Command Prompt (not PowerShell) for best compatibility
- Check logs at `%TEMP%\mcp-server.log` and `%TEMP%\web-server.log`

---

## File Structure

```
mcp-postgres/
├── index.html              # Web chatbot UI
├── web-server.js           # Node.js web server (port 9000)
├── start-all.sh            # Start all services (macOS/Linux)
├── stop-all.sh             # Stop all services (macOS/Linux)
├── start-all.bat           # Start all services (Windows)
├── stop-all.bat            # Stop all services (Windows)
├── README.md               # Documentation
├── SETUP.md                # Setup guide
├── LICENSE                 # License file
├── docs/                   # Screenshots
│   ├── screenshot-ui.png   # Hero image
│   └── feature.png         # Features image
├── copilot-web-bridge/     # VS Code extension (port 9001)
│   └── src/extension.ts    # Extension code
└── mcp-server/             # PostgreSQL MCP Server (port 3000)
    ├── server.py           # HTTP server
    └── .env                # Database config
```

---

**Query your database with natural language!**
