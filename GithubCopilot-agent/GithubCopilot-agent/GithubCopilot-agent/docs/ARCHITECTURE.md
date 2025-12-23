# PostgreSQL MCP Architecture

This document describes the architecture and design of the PostgreSQL MCP project.

## Overview

The PostgreSQL MCP project consists of two main components that work together to enable natural language database interactions through GitHub Copilot:

1. **MCP Server** - FastAPI-based server implementing the Model Context Protocol
2. **VS Code Extension** - Extension that manages the server and integrates with Copilot

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VS Code                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           GitHub Copilot Chat Interface              │  │
│  │                                                       │  │
│  │   User: @postgres Show me all customers              │  │
│  │   Result: [Query results displayed]                  │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │         PostgreSQL MCP Extension                     │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │  Chat Participant Handler                     │  │  │
│  │  │  - Parses user requests                       │  │  │
│  │  │  - Determines appropriate tool                │  │  │
│  │  │  - Formats responses                          │  │  │
│  │  └───────────────┬───────────────────────────────┘  │  │
│  │                  │                                   │  │
│  │  ┌───────────────▼───────────────────────────────┐  │  │
│  │  │  Server Manager                               │  │  │
│  │  │  - Starts/stops MCP server                    │  │  │
│  │  │  - Monitors server health                     │  │  │
│  │  │  - Manages configuration                      │  │  │
│  │  └───────────────┬───────────────────────────────┘  │  │
│  └──────────────────┼───────────────────────────────────┘  │
└───────────────────┼─────────────────────────────────────────┘
                    │ HTTP (127.0.0.1:3000)
                    │
┌───────────────────▼─────────────────────────────────────────┐
│              MCP Server (FastAPI)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               MCP Protocol Layer                     │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  GET /mcp/v1/tools                             │ │  │
│  │  │  - Returns list of available tools             │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  POST /mcp/v1/tools/call                       │ │  │
│  │  │  - Executes requested tool                     │ │  │
│  │  │  - Returns results                             │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │               Tool Handlers                          │  │
│  │  • query_database                                    │  │
│  │  • execute_sql                                       │  │
│  │  • create_table                                      │  │
│  │  • create_stored_procedure                           │  │
│  │  • list_tables                                       │  │
│  │  • describe_table                                    │  │
│  │  • get_table_indexes                                 │  │
│  │  • analyze_query_plan                                │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │         Connection Pool (asyncpg)                    │  │
│  │  - Manages database connections                      │  │
│  │  - Min: 2 connections                                │  │
│  │  - Max: 10 connections                               │  │
│  └──────────────────┬───────────────────────────────────┘  │
└───────────────────┼─────────────────────────────────────────┘
                    │ PostgreSQL Protocol
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                 PostgreSQL Database                         │
│                 (localhost:5431)                            │
│                 Database: AdventureWorks                    │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### VS Code Extension

#### Chat Participant Handler

**Responsibilities:**
- Intercepts `@postgres` messages from Copilot chat
- Parses user intent and extracts parameters
- Routes requests to appropriate MCP tools
- Formats and displays results

**Key Functions:**
- `handleChatRequest()` - Main entry point for chat messages
- `handleQueryRequest()` - Processes SQL queries
- `handleListTablesRequest()` - Lists database tables
- `handleDescribeTableRequest()` - Shows table structure
- `handleCreateRequest()` - Creates database objects

#### Server Manager

**Responsibilities:**
- Spawns and manages MCP server process
- Monitors server health
- Handles server lifecycle (start/stop/restart)
- Updates status bar

**Key Functions:**
- `startMcpServer()` - Spawns Python server process
- `stopMcpServer()` - Terminates server
- `checkServerHealth()` - Polls health endpoint
- `updateStatusBar()` - Updates UI status indicator

#### Configuration Manager

**Responsibilities:**
- Loads and saves database configuration
- Validates settings
- Provides configuration wizard

**Settings:**
- Database credentials (host, port, user, password)
- Server configuration (port, auto-start)
- Python path

### MCP Server

#### MCP Protocol Layer

Implements the Model Context Protocol specification:

**Endpoints:**
- `GET /mcp/v1/tools` - Lists available tools
- `POST /mcp/v1/tools/call` - Executes a tool
- `GET /health` - Health check
- `POST /configure` - Updates configuration

**Tool Definition Schema:**
```python
{
    "name": "tool_name",
    "description": "What the tool does",
    "inputSchema": {
        "type": "object",
        "properties": {
            "param": {"type": "string", "description": "Parameter description"}
        },
        "required": ["param"]
    }
}
```

#### Tool Handlers

Each tool handler is an async function that:
1. Acquires a database connection from the pool
2. Executes the database operation
3. Returns formatted results

**Common Pattern:**
```python
async def tool_function(param: str) -> Dict[str, Any]:
    async with db_pool.acquire() as conn:
        result = await conn.fetch(query)
        return {"data": result}
```

#### Connection Pool

Uses asyncpg's connection pooling:

**Benefits:**
- Connection reuse reduces overhead
- Prevents connection exhaustion
- Automatic connection management
- Better performance under load

**Configuration:**
- Min connections: 2
- Max connections: 10
- Configurable via environment variables

## Data Flow

### Example: User Queries Data

1. **User Input**
   ```
   User types in Copilot: @postgres Show me all customers
   ```

2. **Chat Participant Processing**
   - Extension intercepts the message
   - Parses intent: "query data"
   - Extracts parameters: table = "customers"

3. **Tool Selection**
   - Selects `query_database` tool
   - Constructs SQL: `SELECT * FROM customers`

4. **HTTP Request**
   ```json
   POST /mcp/v1/tools/call
   {
     "name": "query_database",
     "arguments": {
       "query": "SELECT * FROM customers"
     }
   }
   ```

5. **Server Processing**
   - Validates request
   - Acquires database connection
   - Executes query
   - Formats results

6. **HTTP Response**
   ```json
   {
     "result": {
       "rows": [
         {"id": 1, "name": "John", "email": "john@example.com"},
         {"id": 2, "name": "Jane", "email": "jane@example.com"}
       ],
       "row_count": 2
     }
   }
   ```

7. **Chat Response**
   - Extension formats as table
   - Displays in Copilot chat
   - Shows row count

## Security Architecture

### Network Security

- Server binds to `127.0.0.1` only
- No external network access
- Only local processes can connect

### Credential Management

- Passwords stored in VS Code settings
- Environment variables for server
- No credentials in code
- `.env` file excluded from version control

### Database Security

- Use dedicated database user
- Minimal required permissions
- Read-only recommended for queries
- Avoid using database admin accounts

### SQL Injection Prevention

- asyncpg uses parameterized queries
- Server validates input
- No dynamic SQL construction where possible

## Performance Considerations

### Connection Pooling

- Reuses connections
- Configurable pool size
- Automatic connection recovery

### Async Operations

- All database operations are async
- Non-blocking I/O
- Can handle concurrent requests

### Result Limiting

- Large result sets truncated in UI
- LIMIT clauses recommended
- Streaming for large data (future enhancement)

## Error Handling

### Extension Error Handling

```typescript
try {
    const response = await axios.post(url, data);
    // Handle success
} catch (error) {
    // Display error to user
    stream.markdown(`❌ Error: ${error.message}`);
    // Log to output panel
    outputChannel.appendLine(`Error: ${error}`);
}
```

### Server Error Handling

```python
try:
    result = await execute_query(query)
    return {"result": result}
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

### Database Error Handling

- Connection failures retry automatically
- Query errors return to user
- Pool maintains healthy connections

## Extension Points

### Adding New Tools

1. Define tool schema in `list_tools()`
2. Add handler in `call_tool()`
3. Implement tool function
4. Update extension to handle new tool

### Adding New Features

1. **Server-side**:
   - Add new endpoint or tool
   - Update OpenAPI schema
   - Add tests

2. **Extension-side**:
   - Add new command or handler
   - Update package.json
   - Update UI if needed

## Technology Stack

### MCP Server
- **FastAPI** - Web framework
- **uvicorn** - ASGI server
- **asyncpg** - PostgreSQL driver
- **pydantic** - Data validation

### VS Code Extension
- **TypeScript** - Programming language
- **VS Code API** - Extension framework
- **axios** - HTTP client
- **GitHub Copilot API** - Chat integration

## Future Enhancements

### Planned Features

1. **Multi-database support**
   - Switch between databases
   - Save multiple configurations

2. **Query history**
   - Track executed queries
   - Rerun previous queries

3. **Advanced features**
   - Database migrations
   - Backup/restore
   - Performance monitoring

4. **Improved security**
   - Encrypted credential storage
   - OAuth authentication
   - Role-based access control

### Performance Improvements

1. **Caching**
   - Cache table schemas
   - Cache query results (configurable)

2. **Streaming**
   - Stream large result sets
   - Progressive rendering

3. **Optimization**
   - Query optimization suggestions
   - Index recommendations

## Deployment

### Development
- Local server on 127.0.0.1
- Extension Development Host for testing

### Production
- Local server (same as development)
- Packaged VSIX for distribution

### Distribution
- GitHub releases
- VS Code Marketplace (optional)
- Self-hosted for enterprise

## Monitoring and Logging

### Extension Logs
- Output panel in VS Code
- View > Output > PostgreSQL MCP

### Server Logs
- Console output (stdout/stderr)
- Structured logging with timestamps

### Metrics
- Server health checks
- Connection pool stats
- Query execution times

## Conclusion

The PostgreSQL MCP architecture provides:
- Clean separation of concerns
- Scalable design
- Secure local operation
- Easy extension and customization
- Robust error handling

For questions or contributions, see [CONTRIBUTING.md](CONTRIBUTING.md).
