# PostgreSQL MCP VS Code Extension

VS Code extension that integrates PostgreSQL database operations with GitHub Copilot through a local MCP server.

## Overview

This extension allows developers to interact with PostgreSQL databases directly through GitHub Copilot chat interface. It automatically manages a local MCP server that connects to your PostgreSQL database.

## Features

### Chat Mode
- **GitHub Copilot Integration**: Use `@postgres` in Copilot chat to query databases
- **Automatic Server Management**: Starts and manages the MCP server automatically
- **Database Configuration**: Easy setup through VS Code settings or command palette
- **Real-time Status**: Status bar indicator shows server status
- **Multiple Database Operations**: Query, create tables, stored procedures, and more

### Inline Mode (NEW!)
- **Context-Aware Completions**: Get intelligent SQL suggestions while typing
- **Schema Integration**: Completions use your actual database schema (tables, columns, types)
- **Stored Procedure Support**: Auto-complete function definitions with PL/pgSQL syntax
- **Smart Triggers**: Automatically triggers on SQL keywords (CREATE, SELECT, INSERT, etc.)
- **Performance Optimized**: Schema caching for fast, responsive suggestions

👉 **[Quick Start Guide for Inline Mode](./INLINE_MODE_QUICKSTART.md)**

## Installation

### Method 1: Install from VSIX (Recommended)

1. Download or build the `.vsix` file
2. Open VS Code
3. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
4. Type "Extensions: Install from VSIX"
5. Select the `.vsix` file

### Method 2: Build from Source

```bash
# Navigate to extension directory
cd vscode-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npm run package
```

This creates a `.vsix` file in the current directory.

## Prerequisites

- VS Code 1.85.0 or higher
- GitHub Copilot extension installed and activated
- Python 3.8 or higher (for MCP server)
- PostgreSQL database access

## Setup

### Step 1: Install the MCP Server

The extension needs the MCP server to be installed on your machine:

```bash
# Create a directory for the MCP server
mkdir -p ~/.postgres-mcp/mcp-server

# Copy the server files to this directory
cp -r ../mcp-server/* ~/.postgres-mcp/mcp-server/

# Navigate to server directory
cd ~/.postgres-mcp/mcp-server

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Database Connection

**Option A: Using Command Palette**

1. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Run "PostgreSQL MCP: Configure Database Connection"
3. Enter your database details:
   - Host: `localhost`
   - Port: `5431`
   - Database: `AdventureWorks`
   - User: `postgres`
   - Password: (your password)

**Option B: Using Settings**

1. Open VS Code Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "PostgreSQL MCP"
3. Configure the following settings:

```json
{
  "postgresMcp.database.host": "localhost",
  "postgresMcp.database.port": 5431,
  "postgresMcp.database.name": "AdventureWorks",
  "postgresMcp.database.user": "postgres",
  "postgresMcp.database.password": "your_password",
  "postgresMcp.server.port": 3000,
  "postgresMcp.server.autoStart": true,
  "postgresMcp.pythonPath": "python3"
}
```

### Step 3: Start the Server

The server can start automatically (if `autoStart` is enabled) or manually:

**Manual Start:**
- Press `Cmd+Shift+P` / `Ctrl+Shift+P`
- Run "PostgreSQL MCP: Start Server"

**Check Status:**
- Look at the status bar at the bottom of VS Code
- Click on "PostgreSQL MCP" to see detailed status

## Usage

### Two Modes of Operation

This extension offers two powerful ways to work with your PostgreSQL database:

1. **Chat Mode**: Use `@postgres` in GitHub Copilot Chat for interactive queries and commands
2. **Inline Mode**: Get real-time, context-aware SQL completions while editing `.sql` files

### Inline Mode - Quick Example

When editing a `.sql` file with the MCP server running:

```sql
CREATE FUNCTION get_employee_salary(
-- Press Tab here to get auto-completion with parameters and function body
```

The extension will suggest:
```sql
emp_id INT
) RETURNS DECIMAL AS $$
BEGIN
    RETURN (SELECT salary FROM employees WHERE employee_id = emp_id);
END;
$$ LANGUAGE plpgsql;
```

**Key Features:**
- Suggestions include your actual table and column names
- Automatically formats PL/pgSQL syntax
- Works for CREATE TABLE, SELECT, INSERT, and more
- Press Tab to accept, Esc to dismiss

📖 **[Read the Full Inline Mode Guide](./INLINE_MODE_GUIDE.md)**

### Chat Mode - Using with GitHub Copilot Chat

Once configured, use the `@postgres` participant in GitHub Copilot chat:

#### Basic Examples

**List Tables:**
```
@postgres List all tables in the database
```

**Describe Table:**
```
@postgres Describe the customers table
```

**Query Data:**
```
@postgres Show me all users created in the last 7 days
```

**Create Table:**
```
@postgres Create a table called employees with id, name, email, and hire_date columns
```

#### Advanced Examples

**Complex Queries:**
```
@postgres Query orders table and join with customers, show order totals > $1000
```

**Stored Procedures:**
```
@postgres Create a stored procedure to calculate total sales by customer
```

**Query Analysis:**
```
@postgres Explain the query plan for SELECT * FROM large_table WHERE status = 'active'
```

**Index Management:**
```
@postgres Show me all indexes on the orders table
```

### Available Slash Commands

Use these commands with `@postgres` for specific operations:

- `/query` - Execute a SQL query
- `/tables` - List all tables
- `/describe` - Describe a table structure
- `/create` - Create a table or stored procedure

**Example:**
```
@postgres /tables
@postgres /describe customers
@postgres /query SELECT * FROM products WHERE price > 100
```

## Commands

Access these commands via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

### PostgreSQL MCP: Start Server
Starts the MCP server process.

### PostgreSQL MCP: Stop Server
Stops the running MCP server.

### PostgreSQL MCP: Restart Server
Restarts the MCP server (useful after configuration changes).

### PostgreSQL MCP: Configure Database Connection
Interactive wizard to configure database connection.

### PostgreSQL MCP: Show Server Status
Displays detailed server status and connection information.

## Configuration

### Extension Settings

#### Database Settings

- **postgresMcp.database.host**
  - Description: PostgreSQL database host
  - Default: `localhost`

- **postgresMcp.database.port**
  - Description: PostgreSQL database port
  - Default: `5431`

- **postgresMcp.database.name**
  - Description: PostgreSQL database name
  - Default: `AdventureWorks`

- **postgresMcp.database.user**
  - Description: PostgreSQL database user
  - Default: `postgres`

- **postgresMcp.database.password**
  - Description: PostgreSQL database password
  - Default: `` (empty)
  - Note: Stored securely in VS Code settings

#### Server Settings

- **postgresMcp.server.port**
  - Description: MCP server port
  - Default: `3000`

- **postgresMcp.server.autoStart**
  - Description: Automatically start MCP server when VS Code starts
  - Default: `true`

- **postgresMcp.pythonPath**
  - Description: Path to Python executable
  - Default: `python3`
  - Note: Change this if Python is installed in a custom location

#### Inline Mode Settings

- **postgresMcp.inline.enabled**
  - Description: Enable inline completions with MCP context for SQL files
  - Default: `true`

- **postgresMcp.inline.triggerOnKeywords**
  - Description: Trigger inline completions when typing SQL keywords
  - Default: `true`

- **postgresMcp.inline.includeSchemaContext**
  - Description: Include database schema context in inline completion suggestions
  - Default: `true`

## Status Bar

The extension adds a status bar item showing the server status:

- **Green (Running)**: `$(database) PostgreSQL MCP: Running`
  - Server is running and ready to use

- **Yellow (Stopped)**: `$(database) PostgreSQL MCP: Stopped`
  - Server is not running, click to see status

- **Red (Error)**: `$(database) PostgreSQL MCP: Error`
  - Server encountered an error, check Output panel

Click the status bar item to view detailed server status.

## Output Panel

View detailed logs and debug information:

1. Go to View > Output
2. Select "PostgreSQL MCP" from the dropdown

The output panel shows:
- Server startup logs
- Database connection status
- Query execution logs
- Error messages

## Troubleshooting

### Extension not appearing in Command Palette

1. Reload VS Code window (Cmd+R / Ctrl+R)
2. Check Extensions view to ensure it's installed and enabled
3. Look for errors in the Output panel

### Server won't start

**Check Python Installation:**
```bash
python3 --version
# Should show Python 3.8 or higher
```

**Verify MCP Server Installation:**
```bash
ls ~/.postgres-mcp/mcp-server/server.py
# Should exist
```

**Check Dependencies:**
```bash
cd ~/.postgres-mcp/mcp-server
source venv/bin/activate
pip list
# Should show fastapi, uvicorn, asyncpg, etc.
```

**Review Output Panel:**
- Open Output panel (View > Output)
- Select "PostgreSQL MCP"
- Look for error messages

### Can't connect to database

**Test Database Connection:**
```bash
psql -h localhost -p 5431 -U postgres -d AdventureWorks
```

If this fails, fix your PostgreSQL setup before using the extension.

**Check Settings:**
1. Verify database credentials in settings
2. Ensure PostgreSQL is running
3. Check firewall settings

### GitHub Copilot integration not working

**Verify Prerequisites:**
1. GitHub Copilot extension is installed
2. GitHub Copilot is activated (check subscription)
3. MCP server is running (check status bar)

**Try These Steps:**
1. Restart VS Code
2. Restart the MCP server
3. Check Output panel for errors
4. Ensure you're using `@postgres` in Copilot chat

### Status bar shows "Error"

1. Open Output panel for error details
2. Check database credentials
3. Verify PostgreSQL is accessible
4. Try restarting the server

## Development

### Building from Source

```bash
# Clone the repository
cd vscode-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes (development)
npm run watch
```

### Testing

**Launch Extension Development Host:**

1. Open the extension folder in VS Code
2. Press `F5` to launch Extension Development Host
3. A new VS Code window opens with the extension loaded
4. Test the extension in this window

### Debugging

**Debug the Extension:**

1. Set breakpoints in TypeScript files
2. Press `F5` to start debugging
3. Use Debug Console to inspect variables

**View Logs:**

- Extension logs: Output panel > PostgreSQL MCP
- VS Code logs: Help > Toggle Developer Tools > Console

## Package and Distribute

### Create VSIX Package

```bash
npm run package
```

This creates `postgres-mcp-copilot-1.0.0.vsix`

### Install VSIX

```bash
code --install-extension postgres-mcp-copilot-1.0.0.vsix
```

### Publish to Marketplace (Optional)

1. Create a publisher account at https://marketplace.visualstudio.com
2. Get a Personal Access Token
3. Publish:

```bash
vsce publish
```

## Architecture

### Components

1. **Extension Host**: Main TypeScript code running in VS Code
2. **MCP Server**: FastAPI server running as child process
3. **Chat Participant**: Handles `@postgres` commands in Copilot
4. **Status Manager**: Updates status bar and monitors server

### Communication Flow

```
User → Copilot Chat → Chat Participant → HTTP Request → MCP Server → PostgreSQL
                                                            ↓
User ← Copilot Chat ← Chat Participant ← HTTP Response ← MCP Server
```

## Security

### Password Storage

Passwords are stored in VS Code settings. For better security:

1. Use environment variables
2. Use PostgreSQL `.pgpass` file
3. Use connection strings without passwords
4. Limit database user permissions

### Network Security

- Server binds to `127.0.0.1` (localhost only)
- Not accessible from network
- Only local processes can connect

### Best Practices

1. Use a dedicated database user with minimal permissions
2. Don't commit settings with passwords to version control
3. Regularly update dependencies
4. Monitor server logs for suspicious activity

## FAQ

### Q: Can I use this with remote databases?

A: Yes, configure the host to your remote database server. Ensure network access and firewall rules allow the connection.

### Q: Can I use multiple databases?

A: Currently, one database per configuration. You can change settings and restart the server to switch databases.

### Q: Does this work with other SQL databases?

A: Currently PostgreSQL only. The MCP server is designed specifically for PostgreSQL.

### Q: Can I use this without GitHub Copilot?

A: The extension requires GitHub Copilot for the chat interface. However, you can use the MCP server directly via HTTP API.

### Q: Is my data sent to external servers?

A: No. Everything runs locally. Your database credentials and data never leave your machine.

## Changelog

### Version 1.1.0 (Current)
- **NEW**: Inline completion mode with MCP context
- **NEW**: Context-aware SQL suggestions while typing
- **NEW**: Schema caching for improved performance
- **NEW**: Smart triggers for CREATE, SELECT, INSERT, and more
- **NEW**: Stored procedure and function auto-completion
- Improved documentation with inline mode guides

### Version 1.0.0
- Initial release
- GitHub Copilot chat participant
- Automatic MCP server management
- Database configuration wizard
- Status bar integration
- Output panel logging

## License

MIT License

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test your changes thoroughly
4. Submit a pull request

## Support

For help:
- Check this README
- Review the Output panel
- Check the main project documentation
- Open an issue on GitHub
