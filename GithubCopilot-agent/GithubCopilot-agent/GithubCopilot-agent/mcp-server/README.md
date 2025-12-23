# PostgreSQL MCP Server

FastAPI-based Model Context Protocol (MCP) server for PostgreSQL database operations.

## Overview

This server implements the MCP protocol to expose PostgreSQL database operations as tools that can be used by AI assistants like GitHub Copilot.

## Features

- **Query Execution**: Run SELECT queries and get results
- **SQL Execution**: Execute any SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.)
- **Table Management**: Create tables, list tables, describe table structures
- **Stored Procedures**: Create and manage stored procedures/functions
- **Query Analysis**: Analyze query execution plans
- **Index Management**: View table indexes

## Installation

### Prerequisites

- Python 3.8 or higher
- PostgreSQL database
- pip (Python package manager)

### Setup

1. Create a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

## Configuration

Create a `.env` file with your database connection details:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5431
DB_NAME=AdventureWorks
DB_USER=postgres
DB_PASSWORD=your_password

# Server Configuration
SERVER_HOST=127.0.0.1
SERVER_PORT=3000

# Connection Pool (optional)
POOL_MIN_SIZE=2
POOL_MAX_SIZE=10
```

## Running the Server

### Development Mode (with auto-reload):

```bash
uvicorn server:app --reload --host 127.0.0.1 --port 3000
```

### Production Mode:

```bash
python server.py
```

Or with uvicorn:

```bash
uvicorn server:app --host 127.0.0.1 --port 3000 --workers 4
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns server and database connection status.

### List Tools

```bash
GET /mcp/v1/tools
```

Returns all available MCP tools.

### Call Tool

```bash
POST /mcp/v1/tools/call
Content-Type: application/json

{
  "name": "query_database",
  "arguments": {
    "query": "SELECT * FROM users LIMIT 10"
  }
}
```

### Configure Database

```bash
POST /configure
Content-Type: application/json

{
  "host": "localhost",
  "port": 5431,
  "database": "AdventureWorks",
  "user": "postgres",
  "password": "password"
}
```

## Available Tools

### 1. query_database

Execute SELECT queries and retrieve results.

**Parameters:**
- `query` (string): The SQL SELECT query to execute

**Example:**
```json
{
  "name": "query_database",
  "arguments": {
    "query": "SELECT * FROM customers WHERE country = 'USA'"
  }
}
```

### 2. execute_sql

Execute any SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.).

**Parameters:**
- `sql` (string): The SQL statement to execute

**Example:**
```json
{
  "name": "execute_sql",
  "arguments": {
    "sql": "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')"
  }
}
```

### 3. create_table

Create a new table in the database.

**Parameters:**
- `table_name` (string): Name of the table
- `columns` (array): Array of column definitions

**Example:**
```json
{
  "name": "create_table",
  "arguments": {
    "table_name": "products",
    "columns": [
      {"name": "id", "type": "SERIAL", "constraints": "PRIMARY KEY"},
      {"name": "name", "type": "VARCHAR(255)", "constraints": "NOT NULL"},
      {"name": "price", "type": "DECIMAL(10,2)"},
      {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
    ]
  }
}
```

### 4. create_stored_procedure

Create a stored procedure or function.

**Parameters:**
- `procedure_name` (string): Name of the procedure
- `parameters` (string): Parameter definitions
- `return_type` (string): Return type
- `body` (string): Procedure body in SQL

**Example:**
```json
{
  "name": "create_stored_procedure",
  "arguments": {
    "procedure_name": "get_user_count",
    "parameters": "",
    "return_type": "INTEGER",
    "body": "BEGIN\n  RETURN (SELECT COUNT(*) FROM users);\nEND;"
  }
}
```

### 5. list_tables

List all tables in a schema.

**Parameters:**
- `schema` (string, optional): Schema name (default: 'public')

**Example:**
```json
{
  "name": "list_tables",
  "arguments": {
    "schema": "public"
  }
}
```

### 6. describe_table

Get the structure of a table.

**Parameters:**
- `table_name` (string): Name of the table

**Example:**
```json
{
  "name": "describe_table",
  "arguments": {
    "table_name": "customers"
  }
}
```

### 7. get_table_indexes

Get all indexes for a table.

**Parameters:**
- `table_name` (string): Name of the table

**Example:**
```json
{
  "name": "get_table_indexes",
  "arguments": {
    "table_name": "orders"
  }
}
```

### 8. analyze_query_plan

Analyze the execution plan of a query.

**Parameters:**
- `query` (string): The SQL query to analyze

**Example:**
```json
{
  "name": "analyze_query_plan",
  "arguments": {
    "query": "SELECT * FROM large_table WHERE id = 1"
  }
}
```

## Testing

You can test the server using curl:

```bash
# Health check
curl http://127.0.0.1:3000/health

# List tools
curl http://127.0.0.1:3000/mcp/v1/tools

# Execute a query
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "list_tables",
    "arguments": {"schema": "public"}
  }'
```

## Database Connection Pool

The server uses asyncpg connection pooling for efficient database connections:

- **Min Size**: Minimum number of connections (default: 2)
- **Max Size**: Maximum number of connections (default: 10)

Configure these in your `.env` file:

```env
POOL_MIN_SIZE=2
POOL_MAX_SIZE=10
```

## Error Handling

The server handles errors gracefully and returns appropriate HTTP status codes:

- `200 OK` - Successful operation
- `404 Not Found` - Tool not found
- `500 Internal Server Error` - Database or server error

Error responses include detailed error messages:

```json
{
  "detail": "Error message here"
}
```

## Security Best Practices

1. **Never expose the server to the internet** - Bind to 127.0.0.1 only
2. **Use environment variables** - Don't hardcode credentials
3. **Limit database permissions** - Use a dedicated user with minimal permissions
4. **Validate SQL queries** - Be cautious with user-provided SQL
5. **Use connection pooling** - Prevent connection exhaustion

## Troubleshooting

### Can't connect to database

```bash
# Test PostgreSQL connection
psql -h localhost -p 5431 -U postgres -d AdventureWorks

# Check if PostgreSQL is running
pg_isready -h localhost -p 5431
```

### Server won't start

1. Check Python version: `python3 --version`
2. Verify dependencies: `pip list`
3. Check port availability: `lsof -i :3000`
4. Review error logs in console

### Slow queries

1. Use the `analyze_query_plan` tool to identify bottlenecks
2. Check indexes with `get_table_indexes`
3. Consider adding indexes to frequently queried columns
4. Increase connection pool size if needed

## Development

### Project Structure

```
mcp-server/
├── server.py           # Main FastAPI application
├── config.py           # Configuration management
├── requirements.txt    # Python dependencies
├── .env.example       # Example environment variables
└── README.md          # This file
```

### Adding New Tools

To add a new MCP tool:

1. Define the tool in the `list_tools()` endpoint
2. Add a handler in the `call_tool()` endpoint
3. Implement the tool function
4. Document the tool in this README

**Example:**

```python
# 1. Define the tool
Tool(
    name="my_new_tool",
    description="Description of what it does",
    inputSchema={
        "type": "object",
        "properties": {
            "param": {"type": "string", "description": "Parameter description"}
        },
        "required": ["param"]
    }
)

# 2. Add handler
elif request.name == "my_new_tool":
    result = await my_new_tool_function(request.arguments.get("param"))
    return {"result": result}

# 3. Implement function
async def my_new_tool_function(param: str) -> Dict[str, Any]:
    async with db_pool.acquire() as conn:
        # Your implementation here
        return {"status": "success"}
```

## Performance Tips

1. **Use connection pooling** - Already configured by default
2. **Index your tables** - Use `get_table_indexes` to check existing indexes
3. **Analyze queries** - Use `analyze_query_plan` to optimize slow queries
4. **Limit result sets** - Use LIMIT in queries for large tables
5. **Use prepared statements** - asyncpg automatically uses prepared statements

## License

MIT License

## Support

For issues or questions:
- Check the main project README
- Review server logs
- Test database connection independently
- Ensure all dependencies are installed
