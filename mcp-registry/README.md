# MCP Registry

Internal registry for hosting MCP servers.

## Quick Start

Start the registry:
```bash
docker-compose up -d
```

Access:
- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:8000

Stop the registry:
```bash
docker-compose down
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

Check status:
```bash
docker ps
```

View logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

Restart:
```bash
docker-compose restart
```
