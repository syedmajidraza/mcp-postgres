# Internal MCP Registry

A simple, self-hosted registry for Model Context Protocol (MCP) servers. No authentication required - perfect for internal company use.

## Features

- 🚀 **Easy Publishing** - Upload MCP servers via web UI or API
- 🔍 **Search & Browse** - Find servers by name, tags, or description
- 📊 **Statistics** - Track downloads and popular servers
- 🐳 **Docker Ready** - Run with Docker Compose
- 📁 **Auto-Scanning** - Optionally scan network folders for new servers
- 🎨 **Clean UI** - Simple, modern web interface

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start the registry
docker-compose up -d

# Access the registry
# Frontend: http://localhost:3001
# Backend API: http://localhost:8000
```

### Option 2: Local Development

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# Frontend
# Open frontend/index.html in browser
# Or serve with:
cd frontend
python3 -m http.server 8080
```

## Usage

### Publishing a Server (Web UI)

1. Go to http://localhost:3001
2. Click "Publish Server"
3. Fill in the form:
   - **Name**: postgres-mcp-server
   - **Version**: 1.0.0
   - **Description**: PostgreSQL MCP Server
   - **Author**: Your Name
   - **Tags**: database, postgresql
   - **Package**: Upload your .zip or .tar.gz file
4. Click "Publish Server"

### Publishing via API

```bash
curl -X POST http://localhost:8000/api/v1/publish \
  -F "name=my-mcp-server" \
  -F "version=1.0.0" \
  -F "description=My awesome MCP server" \
  -F "author=John Doe" \
  -F "tags=database,analytics" \
  -F "package=@my-server.zip"
```

### Publishing via Network Folder

Simply copy your server to the shared folder:

```bash
cp -r my-mcp-server/ /storage/mcp-servers/my-mcp-server/v1.0.0/
```

The registry will automatically detect and index it!

### Downloading a Server

```bash
# Via API
curl -O http://localhost:8000/api/v1/servers/postgres-mcp-server/1.0.0/download

# Via Web UI
# Click the "Download" button on any server card
```

### Searching Servers

```bash
# Search via API
curl http://localhost:8000/api/v1/servers/search?q=postgres

# Or use the search box in the web UI
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/servers` | GET | List all servers |
| `/api/v1/publish` | POST | Publish new server |
| `/api/v1/servers/search?q=query` | GET | Search servers |
| `/api/v1/servers/{name}/{version}` | GET | Get server details |
| `/api/v1/servers/{name}/{version}/download` | GET | Download server |
| `/api/v1/servers/{name}/{version}` | DELETE | Delete server |
| `/api/v1/stats` | GET | Get registry statistics |

## Directory Structure

```
mcp-registry/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile          # Backend Docker image
├── frontend/
│   ├── index.html          # Web UI
│   ├── nginx.conf          # Nginx configuration
│   └── Dockerfile          # Frontend Docker image
├── storage/                # Server packages storage
│   └── mcp-servers/
│       ├── server-name/
│       │   └── v1.0.0/
│       │       ├── package.zip
│       │       └── metadata.json
│       └── ...
├── docker-compose.yml      # Docker Compose config
└── README.md              # This file
```

## Configuration

### Environment Variables

```env
# Backend
STORAGE_PATH=/storage/mcp-servers  # Where to store packages

# Frontend
API_URL=http://localhost:8000      # Backend API URL
```

### Custom Storage Path

Edit `docker-compose.yml`:

```yaml
services:
  backend:
    volumes:
      - /your/custom/path:/storage/mcp-servers
```

## Server Package Format

Your MCP server package should be a `.zip` or `.tar.gz` containing:

```
my-mcp-server/
├── server.py           # Your MCP server code
├── requirements.txt    # Dependencies
├── README.md          # Documentation
└── config.example.json # Example configuration
```

## Auto-Scanning Network Folders

To enable auto-scanning of a network folder, add a watcher service:

```yaml
# Add to docker-compose.yml
services:
  watcher:
    build: ./backend
    container_name: mcp-registry-watcher
    command: python watcher.py
    volumes:
      - /network/shared/folder:/watch
      - ./storage:/storage/mcp-servers
    environment:
      - WATCH_PATH=/watch
      - STORAGE_PATH=/storage/mcp-servers
    restart: unless-stopped
```

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### Frontend Development

The frontend is static HTML/CSS/JS. Just edit `frontend/index.html` and refresh your browser.

## Production Deployment

1. **Change ports** if needed
2. **Add HTTPS** with a reverse proxy (nginx, Caddy)
3. **Set up backups** for the storage directory
4. **Configure monitoring** (optional)

### Example Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name mcp-registry.yourcompany.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Backend not starting

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Port 8000 already in use
# - Storage directory permissions
```

### Frontend can't connect to backend

1. Check backend is running: `curl http://localhost:8000/`
2. Update API_URL in `frontend/index.html` if needed
3. Check CORS settings in `backend/main.py`

### Server upload fails

- Check file size limits
- Verify storage directory has write permissions
- Check disk space

## License

MIT License - Feel free to use and modify!

## Support

For issues or questions, contact your internal dev team.
