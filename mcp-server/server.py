"""
FastAPI-based MCP Server for PostgreSQL
Provides tools for database operations through the Model Context Protocol
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import asyncpg
import json
import uvicorn
from contextlib import asynccontextmanager
from config import Config
import logging

# Configuration
class DatabaseConfig(BaseModel):
    host: str = Config.DB_HOST
    port: int = Config.DB_PORT
    database: str = Config.DB_NAME
    user: str = Config.DB_USER
    password: str = Config.DB_PASSWORD

# MCP Tool Models
class Tool(BaseModel):
    name: str
    description: str
    inputSchema: Dict[str, Any]

class ToolCallRequest(BaseModel):
    name: str
    arguments: Dict[str, Any]

# Database connection pool
db_pool: Optional[asyncpg.Pool] = None
db_config = DatabaseConfig()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("MCPServer")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database connection pool
    global db_pool
    try:
        db_pool = await asyncpg.create_pool(
            host=db_config.host,
            port=db_config.port,
            database=db_config.database,
            user=db_config.user,
            password=db_config.password,
            min_size=2,
            max_size=10
        )
        print(f"✅ Connected to PostgreSQL database: {db_config.database}")
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        db_pool = None

    yield

    # Shutdown: Close database connection pool
    if db_pool:
        await db_pool.close()
        print("Database connection pool closed")

app = FastAPI(title="PostgreSQL MCP Server", lifespan=lifespan)

# Middleware to log incoming requests in debug mode
@app.middleware("http")
async def log_requests(request: Request, call_next):
    if logger.isEnabledFor(logging.DEBUG):
        logger.debug(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    return response

# MCP Protocol Endpoints

@app.get("/mcp/v1/tools")
async def list_tools():
    """List all available MCP tools"""
    tools = [
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
        ),
        Tool(
            name="execute_sql",
            description="Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE TABLE, etc.) on the PostgreSQL database.",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "The SQL statement to execute"
                    }
                },
                "required": ["sql"]
            }
        ),
        Tool(
            name="create_table",
            description="Create a new table in the PostgreSQL database.",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Name of the table to create"
                    },
                    "columns": {
                        "type": "array",
                        "description": "List of column definitions",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "type": {"type": "string"},
                                "constraints": {"type": "string"}
                            },
                            "required": ["name", "type"]
                        }
                    }
                },
                "required": ["table_name", "columns"]
            }
        ),
        Tool(
            name="create_stored_procedure",
            description="Create a stored procedure or function in the PostgreSQL database.",
            inputSchema={
                "type": "object",
                "properties": {
                    "procedure_name": {
                        "type": "string",
                        "description": "Name of the stored procedure"
                    },
                    "parameters": {
                        "type": "string",
                        "description": "Procedure parameters (e.g., 'param1 INT, param2 VARCHAR(100)')"
                    },
                    "return_type": {
                        "type": "string",
                        "description": "Return type of the procedure (e.g., 'VOID', 'INT', 'TABLE(...)')"
                    },
                    "body": {
                        "type": "string",
                        "description": "The procedure body/logic in SQL"
                    }
                },
                "required": ["procedure_name", "body"]
            }
        ),
        Tool(
            name="list_tables",
            description="List all tables in the current database schema.",
            inputSchema={
                "type": "object",
                "properties": {
                    "schema": {
                        "type": "string",
                        "description": "Schema name (default: 'public')"
                    }
                }
            }
        ),
        Tool(
            name="describe_table",
            description="Get the structure/schema of a specific table including columns, types, and constraints.",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Name of the table to describe"
                    }
                },
                "required": ["table_name"]
            }
        ),
        Tool(
            name="get_table_indexes",
            description="Get all indexes for a specific table.",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Name of the table"
                    }
                },
                "required": ["table_name"]
            }
        ),
        Tool(
            name="analyze_query_plan",
            description="Analyze and return the execution plan for a SQL query using EXPLAIN.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The SQL query to analyze"
                    }
                },
                "required": ["query"]
            }
        )
    ]

    return {"tools": [tool.dict() for tool in tools]}

@app.post("/mcp/v1/tools/call")
async def call_tool(request: ToolCallRequest):
    """Execute an MCP tool"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection not available")

    try:
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(f"Tool call: {request.name} with arguments {request.arguments}")

        if request.name == "query_database":
            result = await execute_query(request.arguments.get("query"))
            return {"result": result}

        elif request.name == "execute_sql":
            result = await execute_sql_statement(request.arguments.get("sql"))
            return {"result": result}

        elif request.name == "create_table":
            result = await create_table(
                request.arguments.get("table_name"),
                request.arguments.get("columns")
            )
            return {"result": result}

        elif request.name == "create_stored_procedure":
            result = await create_stored_procedure(
                request.arguments.get("procedure_name"),
                request.arguments.get("parameters", ""),
                request.arguments.get("return_type", "VOID"),
                request.arguments.get("body")
            )
            return {"result": result}

        elif request.name == "list_tables":
            result = await list_tables(request.arguments.get("schema", "public"))
            return {"result": result}

        elif request.name == "describe_table":
            result = await describe_table(request.arguments.get("table_name"))
            return {"result": result}

        elif request.name == "get_table_indexes":
            result = await get_table_indexes(request.arguments.get("table_name"))
            return {"result": result}

        elif request.name == "analyze_query_plan":
            result = await analyze_query_plan(request.arguments.get("query"))
            return {"result": result}

        else:
            raise HTTPException(status_code=404, detail=f"Tool '{request.name}' not found")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Tool Implementation Functions

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

async def execute_sql_statement(sql: str) -> Dict[str, Any]:
    """Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.)"""
    async with db_pool.acquire() as conn:
        try:
            status = await conn.execute(sql)
            return {
                "status": "success",
                "message": f"Statement executed: {status}"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

async def create_table(table_name: str, columns: List[Dict[str, str]]) -> Dict[str, Any]:
    """Create a new table"""
    column_defs = []
    for col in columns:
        col_def = f"{col['name']} {col['type']}"
        if col.get('constraints'):
            col_def += f" {col['constraints']}"
        column_defs.append(col_def)

    sql = f"CREATE TABLE {table_name} ({', '.join(column_defs)})"

    async with db_pool.acquire() as conn:
        try:
            await conn.execute(sql)
            return {
                "status": "success",
                "message": f"Table '{table_name}' created successfully",
                "sql": sql
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

async def create_stored_procedure(
    procedure_name: str,
    parameters: str,
    return_type: str,
    body: str
) -> Dict[str, Any]:
    """Create a stored procedure or function"""
    param_str = f"({parameters})" if parameters else "()"

    sql = f"""
    CREATE OR REPLACE FUNCTION {procedure_name}{param_str}
    RETURNS {return_type}
    AS $$
    {body}
    $$ LANGUAGE plpgsql;
    """

    async with db_pool.acquire() as conn:
        try:
            await conn.execute(sql)
            return {
                "status": "success",
                "message": f"Stored procedure '{procedure_name}' created successfully",
                "sql": sql
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

async def list_tables(schema: str) -> Dict[str, Any]:
    """List all tables in the schema"""
    query = """
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = $1
    ORDER BY table_name
    """

    async with db_pool.acquire() as conn:
        rows = await conn.fetch(query, schema)
        tables = [dict(row) for row in rows]

        return {
            "schema": schema,
            "tables": tables,
            "count": len(tables)
        }

async def describe_table(table_name: str) -> Dict[str, Any]:
    """Get table structure"""
    query = """
    SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
    """

    async with db_pool.acquire() as conn:
        rows = await conn.fetch(query, table_name)
        columns = [dict(row) for row in rows]

        return {
            "table_name": table_name,
            "columns": columns,
            "column_count": len(columns)
        }

async def get_table_indexes(table_name: str) -> Dict[str, Any]:
    """Get all indexes for a table"""
    query = """
    SELECT
        indexname,
        indexdef
    FROM pg_indexes
    WHERE tablename = $1
    """

    async with db_pool.acquire() as conn:
        rows = await conn.fetch(query, table_name)
        indexes = [dict(row) for row in rows]

        return {
            "table_name": table_name,
            "indexes": indexes,
            "count": len(indexes)
        }

async def analyze_query_plan(query: str) -> Dict[str, Any]:
    """Analyze query execution plan"""
    explain_query = f"EXPLAIN (FORMAT JSON, ANALYZE) {query}"

    async with db_pool.acquire() as conn:
        try:
            result = await conn.fetchval(explain_query)
            return {
                "query": query,
                "plan": result
            }
        except Exception as e:
            # If ANALYZE fails, try without it
            explain_query = f"EXPLAIN (FORMAT JSON) {query}"
            result = await conn.fetchval(explain_query)
            return {
                "query": query,
                "plan": result,
                "note": "Plan generated without execution (ANALYZE failed)"
            }

# Configuration endpoint
@app.post("/configure")
async def configure_database(config: DatabaseConfig):
    """Update database configuration"""
    global db_config, db_pool

    # Close existing pool
    if db_pool:
        await db_pool.close()

    # Update config
    db_config = config

    # Create new pool
    try:
        db_pool = await asyncpg.create_pool(
            host=db_config.host,
            port=db_config.port,
            database=db_config.database,
            user=db_config.user,
            password=db_config.password,
            min_size=2,
            max_size=10
        )
        return {"status": "success", "message": "Database configuration updated"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_status = "connected" if db_pool else "disconnected"
    return {
        "status": "running",
        "database": db_status,
        "config": {
            "host": db_config.host,
            "port": db_config.port,
            "database": db_config.database
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3000)
