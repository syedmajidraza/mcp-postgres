"""
Internal MCP Registry - Backend Server
Simple registry for hosting and discovering MCP servers internally
No authentication required
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import datetime
import shutil
import json
import uvicorn
from typing import List, Optional

app = FastAPI(
    title="Internal MCP Registry",
    description="Simple registry for MCP servers - no auth required",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage configuration
STORAGE_PATH = Path("/storage/mcp-servers")
STORAGE_PATH.mkdir(parents=True, exist_ok=True)

# In-memory database (simple approach)
servers_db = []

# Models
class ServerMetadata:
    def __init__(self, name: str, version: str, description: str,
                 author: str, repository: str, filename: str, tags: List[str] = None):
        self.name = name
        self.version = version
        self.description = description
        self.author = author
        self.repository = repository
        self.filename = filename
        self.tags = tags or []
        self.downloads = 0
        self.created_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()

def load_servers():
    """Load all servers from disk on startup"""
    global servers_db
    servers_db = []

    if not STORAGE_PATH.exists():
        return

    for server_dir in STORAGE_PATH.iterdir():
        if not server_dir.is_dir():
            continue

        for version_dir in server_dir.iterdir():
            if not version_dir.is_dir():
                continue

            metadata_path = version_dir / "metadata.json"
            if metadata_path.exists():
                try:
                    with metadata_path.open() as f:
                        metadata = json.load(f)
                        servers_db.append(metadata)
                except Exception as e:
                    print(f"Error loading {metadata_path}: {e}")

# Load existing servers on startup
@app.on_event("startup")
async def startup_event():
    load_servers()
    print(f"✅ Loaded {len(servers_db)} servers from storage")

# API Endpoints

@app.get("/")
async def root():
    """API information"""
    return {
        "name": "Internal MCP Registry",
        "version": "1.0.0",
        "servers_count": len(servers_db),
        "endpoints": {
            "publish": "POST /api/v1/publish",
            "list": "GET /api/v1/servers",
            "search": "GET /api/v1/servers/search?q=query",
            "download": "GET /api/v1/servers/{name}/{version}/download",
            "details": "GET /api/v1/servers/{name}/{version}"
        }
    }

@app.post("/api/v1/publish")
async def publish_server(
    package: UploadFile = File(...),
    name: str = Form(...),
    version: str = Form(...),
    description: str = Form(""),
    author: str = Form(""),
    repository: str = Form(""),
    tags: str = Form("")  # Comma-separated tags
):
    """
    Publish a new MCP server to the registry
    No authentication required
    """

    # Validate inputs
    if not name or not version:
        raise HTTPException(400, "Name and version are required")

    # Check if version already exists
    existing = next((s for s in servers_db
                    if s["name"] == name and s["version"] == version), None)
    if existing:
        raise HTTPException(409, f"Server {name} v{version} already exists")

    # Create storage directory
    server_dir = STORAGE_PATH / name / version
    server_dir.mkdir(parents=True, exist_ok=True)

    # Save package
    package_path = server_dir / package.filename
    try:
        with package_path.open("wb") as f:
            shutil.copyfileobj(package.file, f)
    except Exception as e:
        raise HTTPException(500, f"Failed to save package: {str(e)}")

    # Create metadata
    metadata = {
        "name": name,
        "version": version,
        "description": description,
        "author": author,
        "repository": repository,
        "filename": package.filename,
        "tags": [t.strip() for t in tags.split(",") if t.strip()],
        "downloads": 0,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "path": str(server_dir)
    }

    # Save metadata to disk
    with (server_dir / "metadata.json").open("w") as f:
        json.dump(metadata, f, indent=2)

    # Add to in-memory database
    servers_db.append(metadata)

    return {
        "success": True,
        "message": f"Server {name} v{version} published successfully!",
        "server": metadata,
        "download_url": f"/api/v1/servers/{name}/{version}/download"
    }

@app.get("/api/v1/servers")
async def list_servers(
    tag: Optional[str] = None,
    author: Optional[str] = None,
    limit: int = 100
):
    """List all published servers with optional filtering"""

    filtered_servers = servers_db

    # Filter by tag
    if tag:
        filtered_servers = [s for s in filtered_servers if tag in s.get("tags", [])]

    # Filter by author
    if author:
        filtered_servers = [s for s in filtered_servers
                          if author.lower() in s.get("author", "").lower()]

    # Sort by created date (newest first)
    filtered_servers = sorted(
        filtered_servers,
        key=lambda s: s.get("created_at", ""),
        reverse=True
    )

    return {
        "total": len(filtered_servers),
        "servers": filtered_servers[:limit]
    }

@app.get("/api/v1/servers/search")
async def search_servers(q: str):
    """Search servers by name, description, or tags"""

    query = q.lower()
    results = []

    for server in servers_db:
        # Search in name, description, tags, author
        if (query in server.get("name", "").lower() or
            query in server.get("description", "").lower() or
            query in server.get("author", "").lower() or
            any(query in tag.lower() for tag in server.get("tags", []))):
            results.append(server)

    return {
        "query": q,
        "total": len(results),
        "results": results
    }

@app.get("/api/v1/servers/{name}/{version}")
async def get_server_details(name: str, version: str):
    """Get details of a specific server version"""

    server = next((s for s in servers_db
                  if s["name"] == name and s["version"] == version), None)

    if not server:
        raise HTTPException(404, f"Server {name} v{version} not found")

    return server

@app.get("/api/v1/servers/{name}/{version}/download")
async def download_server(name: str, version: str):
    """Download MCP server package"""

    # Find server
    server = next((s for s in servers_db
                  if s["name"] == name and s["version"] == version), None)

    if not server:
        raise HTTPException(404, f"Server {name} v{version} not found")

    # Get package path
    server_dir = STORAGE_PATH / name / version
    package_path = server_dir / server["filename"]

    if not package_path.exists():
        raise HTTPException(404, "Package file not found")

    # Increment download count
    server["downloads"] += 1
    server["updated_at"] = datetime.now().isoformat()

    # Update metadata on disk
    metadata_path = server_dir / "metadata.json"
    with metadata_path.open("w") as f:
        json.dump(server, f, indent=2)

    return FileResponse(
        package_path,
        filename=server["filename"],
        media_type="application/octet-stream"
    )

@app.delete("/api/v1/servers/{name}/{version}")
async def delete_server(name: str, version: str):
    """Delete a server version"""

    # Find server
    server = next((s for s in servers_db
                  if s["name"] == name and s["version"] == version), None)

    if not server:
        raise HTTPException(404, f"Server {name} v{version} not found")

    # Remove from database
    servers_db.remove(server)

    # Remove from disk
    server_dir = STORAGE_PATH / name / version
    if server_dir.exists():
        shutil.rmtree(server_dir)

    # If no more versions, remove server directory
    parent_dir = STORAGE_PATH / name
    if parent_dir.exists() and not list(parent_dir.iterdir()):
        parent_dir.rmdir()

    return {
        "success": True,
        "message": f"Server {name} v{version} deleted successfully"
    }

@app.get("/api/v1/stats")
async def get_stats():
    """Get registry statistics"""

    total_downloads = sum(s.get("downloads", 0) for s in servers_db)
    unique_servers = len(set(s["name"] for s in servers_db))

    # Get popular servers
    popular = sorted(servers_db, key=lambda s: s.get("downloads", 0), reverse=True)[:5]

    # Get recent servers
    recent = sorted(servers_db, key=lambda s: s.get("created_at", ""), reverse=True)[:5]

    return {
        "total_servers": len(servers_db),
        "unique_servers": unique_servers,
        "total_downloads": total_downloads,
        "popular_servers": popular,
        "recent_servers": recent
    }

# Mount scripts directory for CLI tools
scripts_dir = Path(__file__).parent.parent / "scripts"
if scripts_dir.exists():
    app.mount("/scripts", StaticFiles(directory=str(scripts_dir)), name="scripts")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
