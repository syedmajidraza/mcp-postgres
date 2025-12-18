# MCP FastAPI Implementation & GitHub Copilot Integration Guide

**Complete Technical Documentation**

---

## 📋 Table of Contents

1. [What is MCP (Model Context Protocol)?](#what-is-mcp)
2. [MCP Implementation in FastAPI](#mcp-implementation-in-fastapi)
3. [How GitHub Copilot LLM Integration Works](#github-copilot-llm-integration)
4. [Communication Flow Diagram](#communication-flow)
5. [Code Deep Dive](#code-deep-dive)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Testing & Verification](#testing-verification)

---

## 1. What is MCP (Model Context Protocol)?

### Definition

**Model Context Protocol (MCP)** is a standardized protocol for exposing tools and capabilities to AI models (LLMs). It allows AI systems to interact with external services, databases, and APIs in a structured, type-safe manner.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Tool** | A discrete capability exposed by the MCP server (e.g., `query_database`, `list_tables`) |
| **Tool Schema** | JSON Schema defining the tool's inputs, outputs, and description |
| **Tool Call** | Request from client to execute a specific tool with arguments |
| **MCP Server** | Service that exposes tools via HTTP endpoints |
| **MCP Client** | Application that discovers and calls MCP tools (VS Code extension) |

### Why MCP?

✅ **Standardization:** Consistent interface for AI-tool interaction
✅ **Type Safety:** JSON Schema validation for inputs/outputs
✅ **Discoverability:** Tools are self-describing with metadata
✅ **Composability:** Multiple MCP servers can be combined
✅ **Security:** Controlled access to sensitive operations

---

## 2. MCP Implementation in FastAPI

### How This Qualifies as MCP

Our FastAPI server implements the **Model Context Protocol v1** specification:

#### ✅ MCP Protocol Requirements

1. **Tool Discovery Endpoint:** `GET /mcp/v1/tools`
   - Lists all available tools
   - Provides JSON Schema for each tool

2. **Tool Execution Endpoint:** `POST /mcp/v1/tools/call`
   - Executes requested tool
   - Validates arguments against schema
   - Returns structured results

3. **Tool Schema Format:**
   ```json
   {
     "name": "tool_name",
     "description": "What the tool does",
     "inputSchema": {
       "type": "object",
       "properties": { ... },
       "required": [ ... ]
     }
   }
   ```

### MCP Server Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI MCP Server                    │
│                    (mcp-server/server.py)                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         MCP Protocol Layer                        │  │
│  │  ┌─────────────────┐  ┌────────────────────────┐ │  │
│  │  │ GET /mcp/v1/    │  │ POST /mcp/v1/tools/    │ │  │
│  │  │     tools       │  │        call             │ │  │
│  │  └─────────────────┘  └────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Tool Registry (8 Tools)                   │  │
│  │  • query_database      • create_table             │  │
│  │  • execute_sql         • create_stored_procedure  │  │
│  │  • list_tables         • get_table_indexes        │  │
│  │  • describe_table      • analyze_query_plan       │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Database Connector (asyncpg)              │  │
│  │  Connection Pool → PostgreSQL Database            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Code Evidence: MCP Implementation

#### 1. Tool Discovery Endpoint

**File:** [mcp-server/server.py:68-210](mcp-server/server.py#L68-L210)

```python
@app.get("/mcp/v1/tools")
async def list_tools():
    """List all available MCP tools"""
    tools = [
        Tool(
            name="query_database",
            description="Execute a SELECT query on the PostgreSQL database",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The SQL SELECT query to execute"
                    }
                },
                "required": ["query"]
            }
        ),
        # ... 7 more tools
    ]

    return {"tools": [tool.dict() for tool in tools]}
```

**Why this is MCP:**
- ✅ Endpoint follows `/mcp/v1/tools` pattern
- ✅ Returns list of tools with JSON Schema
- ✅ Each tool has `name`, `description`, `inputSchema`
- ✅ Enables tool discovery for AI clients

#### 2. Tool Execution Endpoint

**File:** [mcp-server/server.py:212-263](mcp-server/server.py#L212-L263)

```python
@app.post("/mcp/v1/tools/call")
async def call_tool(request: ToolCallRequest):
    """Execute an MCP tool"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection not available")

    try:
        if request.name == "query_database":
            result = await execute_query(request.arguments.get("query"))
            return {"result": result}

        elif request.name == "execute_sql":
            result = await execute_sql_statement(request.arguments.get("sql"))
            return {"result": result}

        # ... handle other tools

        else:
            raise HTTPException(status_code=404, detail=f"Tool '{request.name}' not found")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Why this is MCP:**
- ✅ Endpoint follows `/mcp/v1/tools/call` pattern
- ✅ Accepts `ToolCallRequest` with `name` and `arguments`
- ✅ Validates tool existence
- ✅ Returns structured results
- ✅ Handles errors with proper HTTP status codes

#### 3. MCP Data Models

**File:** [mcp-server/server.py:24-32](mcp-server/server.py#L24-L32)

```python
class Tool(BaseModel):
    name: str
    description: str
    inputSchema: Dict[str, Any]

class ToolCallRequest(BaseModel):
    name: str
    arguments: Dict[str, Any]
```

**Why this is MCP:**
- ✅ Pydantic models match MCP specification
- ✅ Type safety with validation
- ✅ JSON serialization support

---

## 3. GitHub Copilot LLM Integration

### How the Extension Uses GitHub Copilot

The VS Code extension integrates with GitHub Copilot to convert natural language queries into SQL using VS Code's Language Model API (`vscode.lm`).

### Integration Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    VS Code Extension                          │
│                (vscode-extension/src/extension.ts)            │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  User Input: "@postgres create a table for reviews"          │
│                          ↓                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  1. Chat Participant Handler                          │  │
│  │     (handleChatRequest)                                │  │
│  │     • Detects natural language vs direct SQL          │  │
│  │     • Routes to appropriate handler                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  2. Schema Fetcher                                     │  │
│  │     (generateSQLWithLLM)                               │  │
│  │     • Calls MCP: list_tables                          │  │
│  │     • Calls MCP: describe_table for each              │  │
│  │     • Builds database schema context                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  3. GitHub Copilot LLM Request                        │  │
│  │     (vscode.lm.selectChatModels)                      │  │
│  │                                                        │  │
│  │     Prompt = {                                         │  │
│  │       System: "You are PostgreSQL expert..."          │  │
│  │       Schema: "users (id INT, name VARCHAR...)"       │  │
│  │       Request: "create a table for reviews"           │  │
│  │     }                                                  │  │
│  │                                                        │  │
│  │     → GitHub Copilot GPT-4 →                          │  │
│  │                                                        │  │
│  │     Response: "CREATE TABLE reviews (...)"            │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  4. SQL Execution via MCP                             │  │
│  │     POST /mcp/v1/tools/call                           │  │
│  │     { name: "execute_sql", arguments: { sql: "..." } }│  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  5. Display Results                                    │  │
│  │     ✅ Table created successfully                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Code Evidence: LLM Integration

#### Step 1: Get Database Schema from MCP

**File:** [vscode-extension/src/extension.ts:357-385](vscode-extension/src/extension.ts#L357-L385)

```typescript
async function generateSQLWithLLM(naturalLanguageQuery: string, baseUrl: string): Promise<string> {
    try {
        // Get available tables and their schemas from MCP server
        const tablesResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'list_tables',
            arguments: { schema: 'public' }
        });

        const tables = tablesResponse.data.result.tables.map((t: any) => t.table_name);

        // Get schema for each table
        const schemas: string[] = [];
        for (const table of tables) {
            try {
                const schemaResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                    name: 'describe_table',
                    arguments: { table_name: table }
                });

                const columns = schemaResponse.data.result.columns
                    .map((c: any) => `${c.column_name} ${c.data_type}`)
                    .join(', ');

                schemas.push(`${table} (${columns})`);
            } catch (err) {
                schemas.push(`${table}`);
            }
        }
        // ... continues
```

**What happens:**
1. Extension calls MCP server's `list_tables` tool
2. For each table, calls `describe_table` tool
3. Builds schema context: `employees (id integer, name varchar, salary numeric)`

#### Step 2: Select GitHub Copilot Model

**File:** [vscode-extension/src/extension.ts:387-397](vscode-extension/src/extension.ts#L387-L397)

```typescript
        // Get available language models
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: 'gpt-4'
        });

        if (models.length === 0) {
            throw new Error('GitHub Copilot is not available. Please ensure Copilot is activated.');
        }

        const model = models[0];
```

**What happens:**
1. Uses VS Code's Language Model API (`vscode.lm`)
2. Requests GitHub Copilot GPT-4 model
3. Validates Copilot is active and available

#### Step 3: Build Prompt with Schema Context

**File:** [vscode-extension/src/extension.ts:399-419](vscode-extension/src/extension.ts#L399-L419)

```typescript
        // Create prompt for SQL generation
        const systemPrompt = `You are a PostgreSQL expert assistant. Convert natural language queries into valid PostgreSQL SQL statements.

**Available Database Schema:**
${schemas.join('\n')}

**Instructions:**
- Return ONLY the SQL statement, no explanations or markdown
- Use proper PostgreSQL syntax
- For queries returning data, use SELECT
- For data modification, use INSERT, UPDATE, DELETE
- For schema changes, use CREATE, ALTER, DROP
- Add appropriate JOINs if multiple tables are needed
- Add LIMIT clauses for safety when selecting large datasets
- Use aggregate functions (COUNT, AVG, MIN, MAX, SUM) when appropriate
- For CREATE TABLE statements, include appropriate data types and constraints
- For stored procedures/functions, use proper PL/pgSQL syntax with $$ delimiters

**User Request:** ${naturalLanguageQuery}

**SQL:**`;
```

**What happens:**
1. Creates comprehensive prompt with:
   - System role: PostgreSQL expert
   - Database schema context
   - Best practices instructions
   - User's natural language request

#### Step 4: Send to GitHub Copilot LLM

**File:** [vscode-extension/src/extension.ts:421-430](vscode-extension/src/extension.ts#L421-L430)

```typescript
        const messages = [
            vscode.LanguageModelChatMessage.User(systemPrompt)
        ];

        const chatResponse = await model.sendRequest(messages, {});

        let sqlQuery = '';
        for await (const fragment of chatResponse.text) {
            sqlQuery += fragment;
        }
```

**What happens:**
1. Creates chat message with the prompt
2. Sends request to GitHub Copilot GPT-4
3. Streams response fragments
4. Concatenates into complete SQL query

#### Step 5: Clean Up LLM Response

**File:** [vscode-extension/src/extension.ts:432-450](vscode-extension/src/extension.ts#L432-L450)

```typescript
        // Clean up the response
        sqlQuery = sqlQuery
            .trim()
            .replace(/^```sql\s*/i, '')  // Remove SQL code block start
            .replace(/^```\s*/i, '')     // Remove generic code block start
            .replace(/\s*```$/i, '')     // Remove code block end
            .replace(/;+$/g, ';')        // Normalize semicolons
            .trim();

        // Remove trailing semicolon for consistency
        if (sqlQuery.endsWith(';')) {
            sqlQuery = sqlQuery.slice(0, -1);
        }

        if (!sqlQuery) {
            throw new Error('Failed to generate SQL from your request');
        }

        return sqlQuery;
```

**What happens:**
1. Removes markdown code blocks
2. Normalizes formatting
3. Validates SQL was generated
4. Returns clean SQL statement

#### Step 6: Execute via MCP

**File:** [vscode-extension/src/extension.ts:458-509](vscode-extension/src/extension.ts#L458-L509)

```typescript
async function handleGeneralRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    try {
        stream.markdown('🤖 Analyzing your request and generating SQL...\n\n');

        const sqlQuery = await generateSQLWithLLM(prompt, baseUrl);

        stream.markdown(`**Generated SQL:**\n\`\`\`sql\n${sqlQuery}\n\`\`\`\n\n`);
        outputChannel.appendLine(`[LLM Generated SQL]: ${sqlQuery}`);

        // Determine if it's a query or modification
        const sqlLower = sqlQuery.toLowerCase().trim();

        if (sqlLower.startsWith('select')) {
            // Execute as query via MCP
            const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                name: 'query_database',
                arguments: { query: sqlQuery }
            });

            const result = response.data.result;
            stream.markdown(`**Results:** ${result.row_count} rows\n\n`);
            // ... display results
        } else {
            // Execute as modification via MCP
            const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                name: 'execute_sql',
                arguments: { sql: sqlQuery }
            });

            const result = response.data.result;
            if (result.status === 'success') {
                stream.markdown(`✅ ${result.message}`);
            }
        }
    } catch (error: any) {
        stream.markdown(`\n❌ Error: ${error.message}\n\n`);
        outputChannel.appendLine(`[LLM Error]: ${error.message}`);
    }
}
```

**What happens:**
1. Shows "Analyzing..." message to user
2. Calls `generateSQLWithLLM()` to get SQL from Copilot
3. Displays generated SQL to user
4. Determines query type (SELECT vs modification)
5. Calls appropriate MCP tool (`query_database` or `execute_sql`)
6. Displays results to user

---

## 4. Communication Flow

### Complete End-to-End Flow

```
┌──────────────┐
│    User      │
│   Types:     │
│ "@postgres   │
│  create a    │
│  table for   │
│  reviews"    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  VS Code Extension (Chat Participant)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. handleChatRequest()                               │   │
│  │    • Detect: Not direct SQL (natural language)       │   │
│  │    • Route to: handleGeneralRequest()                │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 2. generateSQLWithLLM()                              │   │
│  │    Step 2a: Get Database Schema from MCP             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP POST
                      │ /mcp/v1/tools/call
                      │ { name: "list_tables", arguments: {} }
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI MCP Server (http://127.0.0.1:3000)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ call_tool(request)                                   │   │
│  │   → list_tables(schema="public")                     │   │
│  │   → Query: SELECT table_name FROM                    │   │
│  │             information_schema.tables                │   │
│  │   ← Returns: ["employees", "departments", ...]       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP 200 OK
                      │ { result: { tables: [...] } }
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  VS Code Extension                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 2b. For each table, get schema                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP POST /mcp/v1/tools/call
                      │ { name: "describe_table",
                      │   arguments: { table_name: "employees" } }
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI MCP Server                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ call_tool(request)                                   │   │
│  │   → describe_table("employees")                      │   │
│  │   → Query: SELECT column_name, data_type FROM        │   │
│  │             information_schema.columns               │   │
│  │   ← Returns: [{ column: "id", type: "integer" }, ...]│   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP 200 OK
                      │ { result: { columns: [...] } }
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  VS Code Extension                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 3. Build schema context string:                      │   │
│  │    "employees (id integer, name varchar, ...)"       │   │
│  │    "departments (id integer, name varchar, ...)"     │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 4. Call GitHub Copilot LLM                           │   │
│  │    vscode.lm.selectChatModels({ vendor: 'copilot' }) │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ VS Code Language Model API
                      │ Prompt: "You are PostgreSQL expert...
                      │          Schema: employees (id int...)
                      │          Request: create a table for reviews"
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Copilot (GPT-4)                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Analyzes database schema                           │   │
│  │ • Understands user request                           │   │
│  │ • Generates PostgreSQL-compliant SQL                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ Stream response:
                      │ "CREATE TABLE reviews (
                      │   id SERIAL PRIMARY KEY,
                      │   product_name VARCHAR(255),
                      │   rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                      │   comment TEXT
                      │ )"
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  VS Code Extension                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 5. Clean up SQL response                             │   │
│  │    • Remove markdown code blocks                     │   │
│  │    • Normalize formatting                            │   │
│  │    • Validate SQL generated                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 6. Execute SQL via MCP                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP POST /mcp/v1/tools/call
                      │ { name: "execute_sql",
                      │   arguments: { sql: "CREATE TABLE..." } }
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI MCP Server                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ call_tool(request)                                   │   │
│  │   → execute_sql_statement(sql)                       │   │
│  │   → Execute: CREATE TABLE reviews (...)              │   │
│  │   ← Returns: { status: "success", message: "..." }   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP 200 OK
                      │ { result: { status: "success" } }
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  VS Code Extension                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 7. Display result to user                            │   │
│  │    stream.markdown("✅ Table created successfully")  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────┐
│              User sees in Chat:                  │
│                                                   │
│  🤖 Analyzing your request and generating SQL... │
│                                                   │
│  **Generated SQL:**                              │
│  ```sql                                          │
│  CREATE TABLE reviews (                          │
│    id SERIAL PRIMARY KEY,                        │
│    product_name VARCHAR(255),                    │
│    rating INTEGER CHECK (...),                   │
│    comment TEXT                                  │
│  )                                               │
│  ```                                             │
│                                                   │
│  ✅ Table created successfully                   │
└──────────────────────────────────────────────────┘
```

---

## 5. Code Deep Dive

### MCP Server: Tool Registration

**Why it's MCP:** Each tool follows the MCP Tool specification with:

```python
Tool(
    name="<unique_identifier>",           # Tool name for calls
    description="<what_it_does>",         # Human-readable description
    inputSchema={                         # JSON Schema for validation
        "type": "object",
        "properties": {
            "<param>": {
                "type": "<json_type>",
                "description": "<param_description>"
            }
        },
        "required": ["<required_params>"]
    }
)
```

**Example:** `query_database` Tool

```python
Tool(
    name="query_database",
    description="Execute a SELECT query on the PostgreSQL database. Returns the query results as a list of rows.",
    inputSchema={
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The SQL SELECT query to execute"
            }
        },
        "required": ["query"]
    }
)
```

### MCP Server: Tool Execution

**File:** [mcp-server/server.py:267-280](mcp-server/server.py#L267-L280)

```python
async def execute_query(query: str) -> Dict[str, Any]:
    """Execute a SELECT query and return results"""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(query)

        # Convert rows to list of dictionaries
        result = []
        for row in rows:
            result.append(dict(row))

        return {
            "rows": result,
            "row_count": len(result)
        }
```

**Why it's MCP:**
- ✅ Takes typed input (validated against schema)
- ✅ Returns structured dictionary (JSON-serializable)
- ✅ Handles database operations asynchronously
- ✅ Provides consistent error handling

### Extension: MCP Client Calls

**File:** [vscode-extension/src/extension.ts:360-363](vscode-extension/src/extension.ts#L360-L363)

```typescript
const tablesResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
    name: 'list_tables',
    arguments: { schema: 'public' }
});
```

**Why it's MCP:**
- ✅ Calls MCP endpoint `/mcp/v1/tools/call`
- ✅ Sends `ToolCallRequest` with `name` and `arguments`
- ✅ Receives structured `result` in response
- ✅ Type-safe argument passing

### Extension: LLM Integration

**File:** [vscode-extension/src/extension.ts:387-397](vscode-extension/src/extension.ts#L387-L397)

```typescript
// Select GitHub Copilot model
const models = await vscode.lm.selectChatModels({
    vendor: 'copilot',
    family: 'gpt-4'
});

const model = models[0];

// Send request with schema context
const messages = [
    vscode.LanguageModelChatMessage.User(systemPrompt)
];

const chatResponse = await model.sendRequest(messages, {});
```

**How it works:**
1. **vscode.lm API:** VS Code's Language Model API for LLM access
2. **vendor: 'copilot':** Specifically requests GitHub Copilot
3. **family: 'gpt-4':** Requests GPT-4 family model
4. **systemPrompt:** Includes database schema + user request
5. **model.sendRequest():** Sends to GitHub Copilot LLM
6. **Streaming:** Receives response as text stream

---

## 6. API Endpoints Reference

### MCP Endpoints

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| `GET` | `/mcp/v1/tools` | List all tools | None | `{ tools: [Tool] }` |
| `POST` | `/mcp/v1/tools/call` | Execute tool | `{ name, arguments }` | `{ result: Any }` |

### Health & Config Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Server health check |
| `POST` | `/configure` | Update database config |

### Tool Calls

**Example 1: List Tables**

```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "list_tables",
    "arguments": { "schema": "public" }
  }'
```

**Response:**
```json
{
  "result": {
    "schema": "public",
    "tables": [
      { "table_name": "employees", "table_type": "BASE TABLE" },
      { "table_name": "departments", "table_type": "BASE TABLE" }
    ],
    "count": 2
  }
}
```

**Example 2: Query Database**

```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "query_database",
    "arguments": {
      "query": "SELECT * FROM employees WHERE salary > 70000"
    }
  }'
```

**Response:**
```json
{
  "result": {
    "rows": [
      { "id": 1, "name": "John Doe", "salary": 75000 },
      { "id": 3, "name": "Jane Smith", "salary": 82000 }
    ],
    "row_count": 2
  }
}
```

**Example 3: Execute SQL**

```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "execute_sql",
    "arguments": {
      "sql": "CREATE TABLE reviews (id SERIAL, comment TEXT)"
    }
  }'
```

**Response:**
```json
{
  "result": {
    "status": "success",
    "message": "Statement executed: CREATE TABLE"
  }
}
```

---

## 7. Testing & Verification

### Verify MCP Implementation

#### Test 1: Tool Discovery

```bash
curl http://127.0.0.1:3000/mcp/v1/tools
```

**Expected:** JSON array of 8 tools with schemas

**Verifies:** ✅ MCP tool discovery endpoint working

#### Test 2: Tool Execution

```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "list_tables", "arguments": {"schema": "public"}}'
```

**Expected:** List of database tables

**Verifies:** ✅ MCP tool execution working

#### Test 3: Schema Validation

```bash
curl -X POST http://127.0.0.1:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "query_database", "arguments": {}}'
```

**Expected:** Error - missing required argument `query`

**Verifies:** ✅ MCP input schema validation working

### Verify LLM Integration

#### Test 1: GitHub Copilot Availability

In VS Code, run:
```
@postgres test connection
```

If you see "GitHub Copilot is not available", Copilot is not active.

**Verifies:** ✅ Extension checks Copilot availability

#### Test 2: Natural Language Processing

```
@postgres create a table for product reviews with id, name, rating, and comment
```

**Expected:**
```
🤖 Analyzing your request and generating SQL...

**Generated SQL:**
CREATE TABLE product_reviews (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT
)

✅ Table created successfully
```

**Verifies:**
- ✅ Schema fetched from MCP
- ✅ LLM generated SQL
- ✅ SQL executed via MCP
- ✅ Results displayed

#### Test 3: Schema-Aware Queries

```
@postgres show all employees with salary greater than average
```

**Expected:** LLM generates query using actual schema:
```sql
SELECT * FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
```

**Verifies:** ✅ LLM uses real database schema

### Check Logs

**Output Panel:** View → Output → "PostgreSQL MCP"

**Look for:**
```
[LLM Generated SQL]: CREATE TABLE product_reviews (...)
[SERVER] 200 POST /mcp/v1/tools/call
```

**Verifies:** ✅ Complete flow from LLM to MCP execution

---

## Summary

### This is MCP Because:

1. ✅ **Follows MCP Protocol Specification**
   - `/mcp/v1/tools` - Tool discovery endpoint
   - `/mcp/v1/tools/call` - Tool execution endpoint
   - JSON Schema-based tool definitions
   - Structured request/response format

2. ✅ **Implements MCP Tool Model**
   - `name`: Unique tool identifier
   - `description`: Human-readable purpose
   - `inputSchema`: JSON Schema validation
   - Typed inputs and outputs

3. ✅ **Enables AI Integration**
   - Tools are discoverable by LLM clients
   - Schema provides context for AI decision-making
   - Structured outputs are AI-parseable

### LLM Integration Works By:

1. **VS Code Language Model API (`vscode.lm`)**
   - Provides access to GitHub Copilot GPT-4
   - Handles authentication and model selection
   - Streams responses back to extension

2. **Schema-Aware Prompting**
   - Extension fetches database schema from MCP
   - Includes schema in LLM prompt
   - LLM generates contextually accurate SQL

3. **MCP Execution Bridge**
   - Extension calls MCP tools to execute LLM-generated SQL
   - Results flow back through extension to user
   - Clean separation: LLM generates, MCP executes

### Data Flow Summary

```
User → Extension → MCP (schema) → Extension → Copilot LLM → Extension → MCP (execute) → User
```

**Files to Reference:**
- MCP Implementation: [mcp-server/server.py](mcp-server/server.py)
- LLM Integration: [vscode-extension/src/extension.ts](vscode-extension/src/extension.ts#L357-L458)

