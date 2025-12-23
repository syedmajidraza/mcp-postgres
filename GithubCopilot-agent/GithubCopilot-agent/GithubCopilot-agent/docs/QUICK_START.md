# Quick Start Guide

Get up and running with PostgreSQL MCP in 5 minutes!

## Prerequisites

- Python 3.8+
- Node.js 18+ (for VS Code extension)
- PostgreSQL database
- VS Code with GitHub Copilot

## Installation

### Option 1: Automated Installation (Recommended)

**macOS/Linux:**
```bash
cd postgres-mcp
chmod +x install.sh
./install.sh
```

**Windows:**
```powershell
cd postgres-mcp
powershell -ExecutionPolicy Bypass -File install.ps1
```

The script will:
1. Check prerequisites
2. Set up the MCP server
3. Configure database connection
4. Build the VS Code extension
5. Package everything for installation

### Option 2: Manual Installation

**Step 1: Install MCP Server**
```bash
cd mcp-server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure database
cp .env.example .env
nano .env  # Edit with your database details
```

**Step 2: Build VS Code Extension**
```bash
cd ../vscode-extension

# Install and build
npm install
npm run compile
npm run package
```

## Configuration

### MCP Server (.env file)

```env
DB_HOST=localhost
DB_PORT=5431
DB_NAME=AdventureWorks
DB_USER=postgres
DB_PASSWORD=your_password

SERVER_HOST=127.0.0.1
SERVER_PORT=3000
```

### VS Code Extension

1. Install the `.vsix` file in VS Code
2. Open Settings (Cmd/Ctrl + ,)
3. Search for "PostgreSQL MCP"
4. Configure your database connection

Or use the command:
- `PostgreSQL MCP: Configure Database Connection`

## Usage

### 1. Start the MCP Server

The extension can start it automatically, or start manually:

```bash
cd mcp-server
source venv/bin/activate  # Windows: venv\Scripts\activate
python server.py
```

### 2. Use with GitHub Copilot

Open Copilot Chat and type `@postgres` followed by your request:

```
@postgres List all tables

@postgres Describe the customers table

@postgres SELECT * FROM orders WHERE total > 1000

@postgres Create a table called products with id, name, and price
```

## Examples

### Query Data
```
@postgres Show me all users created this month
```

### Table Operations
```
@postgres List all tables in the database
@postgres Describe the employees table
@postgres Show indexes on the orders table
```

### Create Database Objects
```
@postgres Create a table called inventory with:
- id (primary key)
- product_name (varchar 255)
- quantity (integer)
- last_updated (timestamp)
```

### Analyze Performance
```
@postgres Explain the query plan for SELECT * FROM large_table WHERE status = 'active'
```

## Troubleshooting

### Server won't start
- Check Python version: `python3 --version`
- Verify database connection: `psql -h localhost -p 5431 -U postgres -d AdventureWorks`
- Check Output panel in VS Code

### Extension not working
- Ensure GitHub Copilot is active
- Check server status in status bar
- Restart VS Code

### Can't connect to database
- Verify PostgreSQL is running
- Check database credentials
- Test connection with psql

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [mcp-server/README.md](mcp-server/README.md) for API details
- Review [vscode-extension/README.md](vscode-extension/README.md) for extension features

## Support

- Check the Output panel in VS Code (View > Output > PostgreSQL MCP)
- Review server logs
- Open an issue on GitHub

## Tips

1. **Use slash commands** for specific operations:
   - `@postgres /query SELECT * FROM users`
   - `@postgres /tables`
   - `@postgres /describe customers`

2. **Auto-start server**: Enable in settings:
   - `postgresMcp.server.autoStart: true`

3. **Monitor status**: Check the status bar indicator

4. **View logs**: Output panel shows all operations

5. **Security**: Keep your `.env` file out of version control

Happy querying! 🎉
