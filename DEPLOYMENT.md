# PostgreSQL Chatbot - Server Deployment Guide

## Architecture

```
User Browser (http://your-server.com:9000)
    ↓
Web Server (Node.js - port 9000) - Serves UI + API
    ↓
GitHub Copilot Bridge (VS Code Extension - port 9001) - AI/SQL Generation
    ↓
MCP Server (Python - port 3000) - Database Operations
    ↓
PostgreSQL Database
```

---

## Server Requirements

### Hardware
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB+ free space
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows Server

### Software Dependencies

1. **PostgreSQL** (any version 10+)
2. **Python 3.9+**
3. **Node.js 18+**
4. **VS Code** (for GitHub Copilot)
5. **GitHub Copilot subscription** (active)

---

## Installation Steps

### 1. Install PostgreSQL
Your database should already be installed and accessible.

### 2. Install Python Dependencies

```bash
cd mcp-server
pip3 install -r requirements.txt
```

**Configure database connection:**
```bash
# Create/edit .env file
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
POOL_MIN_SIZE=2
POOL_MAX_SIZE=10
EOF
```

### 3. Install Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # Should be v18+
```

### 4. Install VS Code

**For Linux Server:**
```bash
# Download VS Code
wget https://update.code.visualstudio.com/latest/linux-deb-x64/stable -O vscode.deb
sudo dpkg -i vscode.deb
sudo apt-get install -f  # Fix dependencies

# For headless server, install Xvfb (virtual display)
sudo apt-get install -y xvfb

# Create startup script with Xvfb
cat > start-vscode.sh << 'EOF'
#!/bin/bash
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 &
code --no-sandbox --user-data-dir=/home/$USER/.vscode-server
EOF

chmod +x start-vscode.sh
```

**For macOS Server:**
```bash
# VS Code should be installed normally
# Can run headless or with GUI
```

**For Windows Server:**
- Install VS Code normally from https://code.visualstudio.com/
- Can run as a service

### 5. Install GitHub Copilot in VS Code

```bash
# Install GitHub Copilot extension
code --install-extension GitHub.copilot

# Sign in to GitHub Copilot (requires browser)
# Open VS Code and sign in via UI
```

### 6. Install Copilot Web Bridge Extension

```bash
cd /path/to/mcp-postgres
code --install-extension copilot-web-bridge/copilot-web-bridge-1.0.0.vsix --force
```

### 7. Configure VS Code Workspace

```bash
# Create workspace settings
mkdir -p .vscode
cat > .vscode/settings.json << EOF
{
    "copilotWebBridge.port": 9001,
    "copilotWebBridge.mcpServerUrl": "http://localhost:3000",
    "copilotWebBridge.autoStart": true
}
EOF
```

---

## Running the Services

### Option A: Manual Start (for testing)

**Terminal 1: Start MCP Server**
```bash
cd mcp-server
python3 server.py
```

**Terminal 2: Start VS Code & Copilot Bridge**
```bash
# Open workspace in VS Code
cd /path/to/mcp-postgres
code .

# In VS Code Command Palette (Cmd/Ctrl+Shift+P):
# Type: "Copilot Web Bridge: Start Server"
# Or wait for auto-start if enabled
```

**Terminal 3: Start Web Server**
```bash
cd /path/to/mcp-postgres
node web-server.js
```

### Option B: Production Start (systemd services)

Create systemd service files:

**1. MCP Server Service**
```bash
sudo nano /etc/systemd/system/mcp-server.service
```
```ini
[Unit]
Description=PostgreSQL MCP Server
After=network.target postgresql.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/mcp-postgres/mcp-server
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/python3 server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**2. Web Server Service**
```bash
sudo nano /etc/systemd/system/chatbot-web.service
```
```ini
[Unit]
Description=PostgreSQL Chatbot Web Server
After=network.target mcp-server.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/mcp-postgres
ExecStart=/usr/bin/node web-server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**3. VS Code Copilot Bridge Service**
```bash
sudo nano /etc/systemd/system/vscode-copilot.service
```
```ini
[Unit]
Description=VS Code with Copilot Bridge
After=network.target mcp-server.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/mcp-postgres
Environment="DISPLAY=:99"
ExecStartPre=/usr/bin/Xvfb :99 -screen 0 1024x768x24
ExecStart=/usr/bin/code --no-sandbox --user-data-dir=/home/youruser/.vscode-server /path/to/mcp-postgres
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

**Enable and start services:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable mcp-server chatbot-web vscode-copilot
sudo systemctl start mcp-server chatbot-web vscode-copilot

# Check status
sudo systemctl status mcp-server
sudo systemctl status chatbot-web
sudo systemctl status vscode-copilot
```

---

## Firewall Configuration

### Open Required Ports

```bash
# Ubuntu/Debian with UFW
sudo ufw allow 9000/tcp  # Web UI (public)
sudo ufw allow 3000/tcp  # MCP Server (internal only - optional)
sudo ufw allow 9001/tcp  # Copilot Bridge (internal only - optional)

# Or use iptables
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
```

**Note:** Only port 9000 needs to be publicly accessible. Ports 3000 and 9001 should only be accessible from localhost.

---

## Network Configuration

### For External Access

**Update web-server.js to listen on all interfaces:**
```javascript
// Change from:
server.listen(PORT, () => {

// To:
server.listen(PORT, '0.0.0.0', () => {
```

**Update MCP Server to listen on all interfaces:**
```bash
# In mcp-server/.env
SERVER_HOST=0.0.0.0
```

### Using Nginx Reverse Proxy (Recommended)

**Install Nginx:**
```bash
sudo apt-get install nginx
```

**Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/chatbot
```
```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your server IP

    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Now accessible at: `http://your-domain.com` or `http://your-server-ip`

### SSL/HTTPS (Optional but Recommended)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

---

## Monitoring & Logs

### Check Service Status
```bash
sudo systemctl status mcp-server
sudo systemctl status chatbot-web
sudo systemctl status vscode-copilot
```

### View Logs
```bash
# MCP Server logs
sudo journalctl -u mcp-server -f

# Web Server logs
sudo journalctl -u chatbot-web -f

# VS Code logs
sudo journalctl -u vscode-copilot -f
```

### Health Checks
```bash
# MCP Server
curl http://localhost:3000/health

# Web Server
curl http://localhost:9000/health

# Copilot Bridge
curl http://localhost:9001/health

# Full stack test
curl http://localhost:9000/agent/info
```

---

## Troubleshooting

### VS Code Copilot Bridge Not Starting

**Issue:** Extension doesn't auto-start

**Solution:**
1. Open VS Code manually: `code /path/to/mcp-postgres`
2. Press `Cmd/Ctrl+Shift+P`
3. Type: "Copilot Web Bridge: Start Server"
4. Check Output panel: View → Output → "Copilot Web Bridge"

**Check if running:**
```bash
lsof -i :9001
curl http://localhost:9001/health
```

### GitHub Copilot Authentication

**Issue:** Copilot not signed in on headless server

**Solution:**
- Use SSH with X11 forwarding to access VS Code GUI
- Or use code-server (VS Code in browser)
- Or sign in on local machine and sync settings

### Service Crashes

**Check logs:**
```bash
sudo journalctl -u service-name -n 50
```

**Common issues:**
- Port already in use: `lsof -i :PORT`
- Database connection failed: Check .env credentials
- Xvfb not running: Ensure virtual display is started

---

## Security Considerations

1. **Database Access**
   - Use read-only database user for queries
   - Never expose database directly to internet
   - Use strong passwords

2. **API Authentication** (To Add)
   - Currently no auth - anyone can access
   - Add JWT or session-based authentication
   - Implement rate limiting

3. **Input Validation**
   - SQL injection protection (via MCP server)
   - Validate all user inputs
   - Sanitize AI-generated SQL

4. **Network Security**
   - Use firewall (UFW/iptables)
   - Only expose port 9000 publicly
   - Use HTTPS in production
   - Keep services internal (localhost only)

5. **Updates**
   - Keep VS Code updated
   - Update Node.js and Python packages regularly
   - Monitor for security advisories

---

## Access URLs

After deployment:

- **Local:** http://localhost:9000
- **Network:** http://SERVER_IP:9000
- **With Domain:** http://your-domain.com (if using Nginx)
- **With HTTPS:** https://your-domain.com (if using SSL)

Users access the chatbot by navigating to any of these URLs in their browser.

---

## Process Management Commands

```bash
# Start all services
sudo systemctl start mcp-server chatbot-web vscode-copilot

# Stop all services
sudo systemctl stop mcp-server chatbot-web vscode-copilot

# Restart all services
sudo systemctl restart mcp-server chatbot-web vscode-copilot

# View status
sudo systemctl status mcp-server chatbot-web vscode-copilot

# Enable auto-start on boot
sudo systemctl enable mcp-server chatbot-web vscode-copilot

# Disable auto-start
sudo systemctl disable mcp-server chatbot-web vscode-copilot
```

---

## Backup & Maintenance

### Backup Important Files
```bash
# Database backup
pg_dump -U youruser database_name > backup.sql

# Application backup
tar -czf chatbot-backup.tar.gz mcp-postgres/

# Configuration backup
cp -r .vscode ~/backups/
cp mcp-server/.env ~/backups/
```

### Updates
```bash
# Update Python packages
cd mcp-server
pip3 install --upgrade -r requirements.txt

# Update Node.js packages (if any added later)
npm update

# Rebuild VS Code extension (if modified)
cd copilot-web-bridge
npm run compile
npm run package
code --install-extension copilot-web-bridge-1.0.0.vsix --force
```

---

## Summary Checklist

- [ ] PostgreSQL database installed and configured
- [ ] Python 3.9+ installed with MCP dependencies
- [ ] Node.js 18+ installed
- [ ] VS Code installed with GitHub Copilot signed in
- [ ] Copilot Web Bridge extension installed
- [ ] .env file configured with database credentials
- [ ] .vscode/settings.json configured
- [ ] All services running (MCP, Web, VS Code)
- [ ] Port 9000 accessible from network/internet
- [ ] Firewall rules configured
- [ ] (Optional) Nginx reverse proxy configured
- [ ] (Optional) SSL certificate installed
- [ ] Health checks passing
- [ ] Tested from external browser

---

## Support

If services fail to start, check:
1. Logs: `sudo journalctl -u service-name`
2. Port conflicts: `lsof -i :PORT`
3. Database connectivity: `psql -h localhost -U user -d database`
4. GitHub Copilot status in VS Code
