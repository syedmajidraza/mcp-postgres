# MCP Registry

Internal registry for hosting MCP servers.

## Quick Start

### Start the registry

**Docker:**
```bash
docker-compose up -d
```

**Podman:**
```bash
podman-compose up -d
# OR with alias
alias docker=podman && alias docker-compose=podman-compose
docker-compose up -d
```

### Access

- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:8000

### Stop the registry

**Docker:**
```bash
docker-compose down
```

**Podman:**
```bash
podman-compose down
```

## Publish a Server

### Via Web UI
1. Go to http://localhost:3001
2. Click "Publish Server"
3. Fill in details and upload package (.tar.gz)
4. Click "Publish Server"

### Via API
```bash
cd /path/to/your-mcp-server
tar -czf your-server-1.0.0.tar.gz .

curl -X POST http://localhost:8000/api/v1/publish \
  -F "name=your-server" \
  -F "version=1.0.0" \
  -F "description=Your MCP server description" \
  -F "author=Your Name" \
  -F "tags=database,postgresql" \
  -F "package=@your-server-1.0.0.tar.gz"
```

## API Endpoints

- `GET /api/v1/servers` - List all servers
- `GET /api/v1/servers/search?q=query` - Search servers
- `GET /api/v1/servers/{name}/{version}/download` - Download server
- `POST /api/v1/publish` - Publish new server

## Directory Structure

```
mcp-registry/
├── backend/          # FastAPI backend
├── frontend/         # Web UI
├── storage/          # Server packages
└── docker-compose.yml
```

## Troubleshooting

### Check status

**Docker:**
```bash
docker ps
```

**Podman:**
```bash
podman ps
```

### View logs

**Docker:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**Podman:**
```bash
podman-compose logs backend
podman-compose logs frontend
```

### Restart

**Docker:**
```bash
docker-compose restart
```

**Podman:**
```bash
podman-compose restart
```

## Podman Setup

If you don't have `podman-compose` installed:

```bash
# Install podman-compose
pip3 install podman-compose

# OR create aliases to use Docker commands
echo "alias docker=podman" >> ~/.bashrc
echo "alias docker-compose=podman-compose" >> ~/.bashrc
source ~/.bashrc
```

Then use all Docker commands as normal!
