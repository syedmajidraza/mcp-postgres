# PostgreSQL MCP Project

A complete solution for connecting GitHub Copilot to PostgreSQL databases using the Model Context Protocol (MCP).

## Overview

This project consists of two main components:

1. **MCP Server** - A FastAPI-based server that provides database operations through MCP tools
2. **VS Code Extension** - A VS Code extension that runs the MCP server and integrates with GitHub Copilot

## Features

- Execute SQL queries directly from GitHub Copilot chat
- List all tables in your database
- Describe table structures
- Create tables and stored procedures
- Analyze query execution plans
- Get table indexes
- Execute any SQL statement (INSERT, UPDATE, DELETE, etc.)

## Project Structure

```
postgres-mcp-project/
├── mcp-server/              # FastAPI MCP server
│   ├── server.py           # Main server implementation
│   ├── config.py           # Configuration management
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Example environment variables
│
├── vscode-extension/       # VS Code extension
│   ├── src/
│   │   └── extension.ts    # Extension implementation
│   ├── package.json        # Extension manifest
│   └── tsconfig.json       # TypeScript configuration
│
└── README.md              # This file
```

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- PostgreSQL database
- VS Code with GitHub Copilot extension

### Installation

#### Step 1: Set up the MCP Server

```bash
cd mcp-server

# Create a virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

#### Step 2: Configure Database Connection

Edit the `.env` file with your PostgreSQL connection details:

```env
DB_HOST=localhost
DB_PORT=5431
DB_NAME=AdventureWorks
DB_USER=postgres
DB_PASSWORD=your_password_here
```

#### Step 3: Test the MCP Server

```bash
# Start the server
python server.py

# Or use uvicorn directly
uvicorn server:app --host 127.0.0.1 --port 3000
```

The server should start at `http://127.0.0.1:3000`

You can test it by visiting:
- Health check: `http://127.0.0.1:3000/health`
- List tools: `http://127.0.0.1:3000/mcp/v1/tools`

#### Step 4: Install VS Code Extension

```bash
cd ../vscode-extension

# Install dependencies
npm install

# Compile the extension
npm run compile

# Package the extension
npm run package
```

This will create a `.vsix` file that you can install in VS Code.

#### Step 5: Install the Extension in VS Code

1. Open VS Code
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Extensions: Install from VSIX"
4. Select the generated `.vsix` file

#### Step 6: Configure the Extension

1. Open VS Code settings (`Cmd+,` or `Ctrl+,`)
2. Search for "PostgreSQL MCP"
3. Configure your database connection:
   - Host: `localhost`
   - Port: `5431`
   - Database: `AdventureWorks`
   - User: `postgres`
   - Password: (your password)

Or use the command palette:
- Press `Cmd+Shift+P` / `Ctrl+Shift+P`
- Run "PostgreSQL MCP: Configure Database Connection"

## Usage

### Starting the MCP Server

The server can start automatically when VS Code starts (if configured), or manually:

**Via Command Palette:**
- Press `Cmd+Shift+P` / `Ctrl+Shift+P`
- Run "PostgreSQL MCP: Start Server"

**Via Settings:**
Set `postgresMcp.server.autoStart` to `true` for automatic startup

### Using with GitHub Copilot Chat

Once the extension is installed and the server is running, you can use the `@postgres` chat participant in GitHub Copilot:

1. Open GitHub Copilot Chat panel
2. Type `@postgres` followed by your question

**Examples:**

```
@postgres List all tables in the database

@postgres Describe the customers table

@postgres Query all users where age > 25

@postgres Create a table called products with id, name, and price columns

@postgres Show me the indexes on the orders table

@postgres Explain the query plan for SELECT * FROM large_table WHERE id = 1
```

### Available Commands

- `@postgres /query` - Execute a SQL query
- `@postgres /tables` - List all tables
- `@postgres /describe` - Describe a table structure
- `@postgres /create` - Create a table or stored procedure

### Available MCP Tools

The server provides the following tools:

1. **query_database** - Execute SELECT queries
2. **execute_sql** - Execute any SQL statement
3. **create_table** - Create a new table
4. **create_stored_procedure** - Create stored procedures/functions
5. **list_tables** - List all tables in a schema
6. **describe_table** - Get table structure
7. **get_table_indexes** - Get table indexes
8. **analyze_query_plan** - Analyze query execution plan

## Managing the Server

### Check Server Status

- Via Status Bar: Click the PostgreSQL MCP status indicator
- Via Command: Run "PostgreSQL MCP: Show Server Status"

### Stop the Server

- Via Command: Run "PostgreSQL MCP: Stop Server"

### Restart the Server

- Via Command: Run "PostgreSQL MCP: Restart Server"

## Troubleshooting

### Server won't start

1. Check Python is installed: `python3 --version`
2. Check dependencies are installed: `pip list`
3. Check the Output panel in VS Code (View > Output > PostgreSQL MCP)
4. Verify database credentials in settings

### Can't connect to database

1. Verify PostgreSQL is running
2. Check database credentials
3. Verify database port (default: 5431 for your AdventureWorks database)
4. Check firewall settings

### Extension not working with Copilot

1. Ensure GitHub Copilot extension is installed and activated
2. Restart VS Code after installing the extension
3. Check that the MCP server is running (status bar indicator)
4. Review the Output panel for errors

### Database connection errors

1. Check PostgreSQL is running: `psql -h localhost -p 5431 -U postgres -d AdventureWorks`
2. Verify credentials in `.env` file or VS Code settings
3. Check database logs for connection errors

## Configuration Reference

### Server Configuration (.env)

```env
# Database connection
DB_HOST=localhost          # PostgreSQL host
DB_PORT=5431              # PostgreSQL port
DB_NAME=AdventureWorks    # Database name
DB_USER=postgres          # Database user
DB_PASSWORD=              # Database password

# Server settings
SERVER_HOST=127.0.0.1     # Server bind address
SERVER_PORT=3000          # Server port

# Connection pool (optional)
POOL_MIN_SIZE=2           # Minimum pool connections
POOL_MAX_SIZE=10          # Maximum pool connections
```

### VS Code Extension Settings

- `postgresMcp.database.host` - Database host (default: localhost)
- `postgresMcp.database.port` - Database port (default: 5431)
- `postgresMcp.database.name` - Database name (default: AdventureWorks)
- `postgresMcp.database.user` - Database user (default: postgres)
- `postgresMcp.database.password` - Database password
- `postgresMcp.server.port` - MCP server port (default: 3000)
- `postgresMcp.server.autoStart` - Auto-start server (default: true)
- `postgresMcp.pythonPath` - Path to Python executable (default: python3)

## Development

### MCP Server Development

```bash
cd mcp-server

# Activate virtual environment
source venv/bin/activate

# Install in development mode
pip install -r requirements.txt

# Run with hot reload
uvicorn server:app --reload --host 127.0.0.1 --port 3000
```

### VS Code Extension Development

```bash
cd vscode-extension

# Install dependencies
npm install

# Compile with watch mode
npm run watch

# Press F5 in VS Code to launch Extension Development Host
```

## Security Considerations

1. **Never commit credentials** - Keep `.env` files out of version control
2. **Use environment variables** - Store sensitive data in environment variables
3. **Limit database permissions** - Create a dedicated database user with minimal required permissions
4. **Local connections only** - The MCP server binds to 127.0.0.1 by default
5. **Secure password storage** - VS Code stores passwords in the system keychain

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check the troubleshooting section
- Review the VS Code Output panel for logs

## Changelog

### Version 1.0.0
- Initial release
- FastAPI-based MCP server
- VS Code extension with Copilot integration
- Support for basic database operations
- Query execution and table management
- Stored procedure creation
