# Testing Guide

Complete testing guide for the PostgreSQL MCP project.

## Quick Test Checklist

After installation, verify everything works:

- [ ] MCP server starts without errors
- [ ] Server responds to health check
- [ ] VS Code extension loads
- [ ] Status bar shows server status
- [ ] `@postgres` works in Copilot chat
- [ ] Can list tables
- [ ] Can execute queries
- [ ] Can create tables

## Testing the MCP Server

### 1. Manual Server Testing

#### Start the Server

**macOS/Linux:**
```bash
cd mcp-server
source venv/bin/activate
python server.py
```

**Windows:**
```cmd
cd mcp-server
venv\Scripts\activate
python server.py
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
✅ Connected to PostgreSQL database: AdventureWorks
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:3000
```

#### Health Check

**Test 1: Health Endpoint**
```bash
curl http://127.0.0.1:3000/health
```

**Expected Response:**
```json
{
  "status": "running",
  "database": "connected",
  "config": {
    "host": "localhost",
    "port": 5431,
    "database": "AdventureWorks"
  }
}
```

#### List Available Tools

**Test 2: MCP Tools Endpoint**
```bash
curl http://127.0.0.1:3000/mcp/v1/tools
```

**Expected Response:**
```json
{
  "tools": [
    {
      "name": "query_database",
      "description": "Execute a SELECT query...",
      "inputSchema": {...}
    },
    ...
  ]
}
```

#### Execute a Tool

**Test 3: List Tables**
```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "list_tables",
    "arguments": {"schema": "public"}
  }'
```

**Expected Response:**
```json
{
  "result": {
    "schema": "public",
    "tables": [
      {"table_name": "customers", "table_type": "BASE TABLE"},
      {"table_name": "orders", "table_type": "BASE TABLE"}
    ],
    "count": 2
  }
}
```

**Test 4: Execute Query**
```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "query_database",
    "arguments": {
      "query": "SELECT * FROM customers LIMIT 5"
    }
  }'
```

**Test 5: Describe Table**
```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "describe_table",
    "arguments": {"table_name": "customers"}
  }'
```

### 2. Database Connection Testing

#### Test PostgreSQL Connection

**Direct psql test:**
```bash
psql -h localhost -p 5431 -U postgres -d AdventureWorks -c "SELECT 1"
```

**Expected Output:**
```
 ?column?
----------
        1
(1 row)
```

#### Test Connection from Python

Create `test_connection.py`:
```python
import asyncpg
import asyncio

async def test():
    conn = await asyncpg.connect(
        host='localhost',
        port=5431,
        database='AdventureWorks',
        user='postgres',
        password='your_password'
    )
    result = await conn.fetchval('SELECT 1')
    print(f"Connection successful! Result: {result}")
    await conn.close()

asyncio.run(test())
```

Run:
```bash
cd mcp-server
source venv/bin/activate
python test_connection.py
```

### 3. Error Handling Tests

#### Test Invalid Query
```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "query_database",
    "arguments": {
      "query": "SELECT * FROM nonexistent_table"
    }
  }'
```

**Expected:** Error response with details

#### Test Invalid Tool
```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "invalid_tool",
    "arguments": {}
  }'
```

**Expected:** 404 error

## Testing the VS Code Extension

### 1. Installation Testing

#### Install the Extension

1. Open VS Code
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Extensions: Install from VSIX"
4. Select the `.vsix` file from `vscode-extension/`

**Expected:** Extension installs without errors

#### Verify Installation

1. Go to Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for "PostgreSQL MCP"
3. Should appear as installed

### 2. Command Testing

#### Test: Start Server

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run "PostgreSQL MCP: Start Server"

**Expected:**
- Output panel shows server starting
- Status bar changes to "Running" (green)
- No error messages

#### Test: Show Status

1. Open Command Palette
2. Run "PostgreSQL MCP: Show Server Status"

**Expected:**
- Dialog shows server status
- Database connection status
- Configuration details

#### Test: Configure Database

1. Open Command Palette
2. Run "PostgreSQL MCP: Configure Database Connection"
3. Enter database details

**Expected:**
- Prompts for each setting
- Settings saved successfully
- Confirmation message

#### Test: Stop Server

1. Open Command Palette
2. Run "PostgreSQL MCP: Stop Server"

**Expected:**
- Server process terminates
- Status bar changes to "Stopped" (yellow)
- Confirmation message

### 3. GitHub Copilot Integration Testing

#### Prerequisites
- GitHub Copilot extension installed
- Copilot activated
- MCP server running

#### Test: Basic Chat

1. Open Copilot Chat panel
2. Type: `@postgres List all tables`

**Expected:**
- Extension intercepts message
- Makes API call to MCP server
- Displays formatted table list
- Shows table count

#### Test: Query Execution

```
@postgres SELECT * FROM customers LIMIT 5
```

**Expected:**
- Query executes
- Results formatted as table
- Row count displayed

#### Test: Table Description

```
@postgres Describe the customers table
```

**Expected:**
- Table structure displayed
- Column names, types, constraints shown
- Formatted clearly

#### Test: Create Table

```
@postgres Create a table called test_table with id and name columns
```

**Expected:**
- SQL generated
- Table created successfully
- Confirmation message

#### Test: Slash Commands

```
@postgres /tables
@postgres /describe customers
@postgres /query SELECT 1
```

**Expected:**
- Each command works correctly
- Appropriate results returned

### 4. Status Bar Testing

#### Visual Tests

1. **Server Stopped:**
   - Status bar shows: "$(database) PostgreSQL MCP: Stopped"
   - Yellow background
   - Click shows status

2. **Server Running:**
   - Status bar shows: "$(database) PostgreSQL MCP: Running"
   - Green (default) background
   - Click shows status

3. **Server Error:**
   - Status bar shows: "$(database) PostgreSQL MCP: Error"
   - Red background
   - Click shows error details

### 5. Configuration Testing

#### Test Settings

Open VS Code Settings and verify:

1. **Database Settings:**
   - `postgresMcp.database.host` works
   - `postgresMcp.database.port` accepts numbers
   - `postgresMcp.database.name` works
   - `postgresMcp.database.user` works
   - Password field is secure

2. **Server Settings:**
   - `postgresMcp.server.port` works
   - `postgresMcp.server.autoStart` toggles
   - `postgresMcp.pythonPath` accepts paths

#### Test Auto-Start

1. Set `postgresMcp.server.autoStart` to `true`
2. Restart VS Code
3. Check if server starts automatically

**Expected:** Server starts on VS Code launch

### 6. Output Panel Testing

#### Check Logs

1. Go to View > Output
2. Select "PostgreSQL MCP" from dropdown

**Expected to see:**
- Server startup logs
- Database connection status
- Query execution logs
- Error messages (if any)

#### Test Log Output

Execute various commands and verify logs show:
- Command execution
- Server requests
- Query results
- Errors with details

## Integration Testing

### End-to-End Workflow Test

**Scenario: New Developer Setup**

1. ✅ Install MCP server
2. ✅ Configure database credentials
3. ✅ Install VS Code extension
4. ✅ Start MCP server
5. ✅ Test basic query with `@postgres`
6. ✅ Create a test table
7. ✅ Query the test table
8. ✅ Drop the test table

### Multi-Operation Test

```
# In Copilot Chat:

@postgres Create a table called test_users with id, name, and email

@postgres INSERT INTO test_users (name, email) VALUES ('Test User', 'test@example.com')

@postgres SELECT * FROM test_users

@postgres DROP TABLE test_users
```

**Expected:** All operations succeed in sequence

## Performance Testing

### Load Testing MCP Server

**Test concurrent requests:**

```bash
# Install Apache Bench
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 -p request.json -T application/json \
  http://127.0.0.1:3000/mcp/v1/tools/call
```

Create `request.json`:
```json
{
  "name": "list_tables",
  "arguments": {"schema": "public"}
}
```

**Expected:**
- No errors
- Reasonable response times (< 100ms for simple queries)
- No connection pool exhaustion

### Query Performance

Test with large result sets:

```
@postgres SELECT * FROM large_table LIMIT 1000
```

**Expected:**
- Results display in reasonable time
- No timeout errors
- Memory usage acceptable

## Troubleshooting Tests

### Common Issues to Test

#### Test: Database Connection Failure

1. Stop PostgreSQL
2. Start MCP server

**Expected:**
- Error message in logs
- Status shows disconnected
- Helpful error message

#### Test: Wrong Credentials

1. Set incorrect password in `.env`
2. Start server

**Expected:**
- Authentication error
- Clear error message
- Suggestion to check credentials

#### Test: Server Port Conflict

1. Start server on port 3000
2. Try to start another instance

**Expected:**
- Port conflict error
- Clear error message
- Suggestion to change port

#### Test: Extension Without Server

1. Stop MCP server
2. Try `@postgres` command

**Expected:**
- Warning message
- Suggestion to start server
- No crash

## Automated Testing

### Future: Unit Tests for MCP Server

Create `test_server.py`:

```python
import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "running"

def test_list_tools():
    response = client.get("/mcp/v1/tools")
    assert response.status_code == 200
    assert "tools" in response.json()

def test_query_database():
    response = client.post(
        "/mcp/v1/tools/call",
        json={
            "name": "query_database",
            "arguments": {"query": "SELECT 1"}
        }
    )
    assert response.status_code == 200
```

Run:
```bash
pytest test_server.py
```

### Future: Extension Tests

Create tests in `vscode-extension/src/test/`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('postgres-mcp-copilot'));
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('postgres-mcp.startServer'));
  });
});
```

## Test Reports

### Success Criteria

✅ **MCP Server:**
- Starts without errors
- Connects to database
- All 8 tools work correctly
- Handles errors gracefully
- Performance < 100ms for simple queries

✅ **VS Code Extension:**
- Installs successfully
- All commands work
- Status bar updates correctly
- Copilot integration works
- Logs are helpful

✅ **Integration:**
- End-to-end workflow succeeds
- Multiple operations work
- No memory leaks
- No connection issues

## Bug Reporting Template

When reporting bugs, include:

```markdown
## Bug Report

**Environment:**
- OS:
- Python version:
- Node.js version:
- PostgreSQL version:
- VS Code version:

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Logs:**
```
[Paste relevant logs from Output panel]
```

**Screenshots:**
[If applicable]
```

## Conclusion

Regular testing ensures:
- Code quality
- Reliability
- User experience
- Early bug detection

Test frequently and thoroughly!

For issues, see [CONTRIBUTING.md](CONTRIBUTING.md).
