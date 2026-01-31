"""
FastAPI-based MCP Server for PostgreSQL (Read-Only)
Provides read-only tools for database operations through the Model Context Protocol
"""

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional
import asyncpg
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
            min_size=Config.POOL_MIN_SIZE,
            max_size=Config.POOL_MAX_SIZE
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

app = FastAPI(title="PostgreSQL MCP Server (Read-Only)", lifespan=lifespan)

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
    """Execute an MCP tool (read-only operations only)"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection not available")

    try:
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(f"Tool call: {request.name} with arguments {request.arguments}")

        if request.name == "query_database":
            result = await execute_query(request.arguments.get("query"))
            return {"result": result}

        elif request.name == "list_tables":
            result = await list_tables(request.arguments.get("schema", "public"))
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
    uvicorn.run(app, host=Config.SERVER_HOST, port=Config.SERVER_PORT)
