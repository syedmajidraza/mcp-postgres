# VS Code Server Setup - Detailed Guide

## Why VS Code Must Run on Server

GitHub Copilot is a **VS Code extension** that:
- Only works inside VS Code
- Requires active GitHub authentication
- Needs to be running to process AI requests
- Cannot be extracted or run standalone

**Our Copilot Web Bridge extension runs INSIDE VS Code** and acts as a bridge between the web chatbot and GitHub Copilot's API.

---

## Understanding Headless VS Code

### What is "Headless"?

**Headless** = Running VS Code on a server without a graphical display/monitor.

**The Challenge:**
- VS Code is designed as a desktop application with a GUI
- Linux servers typically don't have displays
- VS Code needs a display to start, even if you don't see it

**The Solution:**
- Use **Xvfb** (X Virtual Frame Buffer) - a virtual display
- VS Code thinks there's a screen, but it's virtual
- No physical monitor needed

---

## Three Options for Running VS Code on Server

### Option 1: Xvfb (Virtual Display) - Recommended for Linux

**What it does:**
- Creates a fake display (`:99`) in memory
- VS Code connects to this virtual display
- Runs completely headless (no GUI visible)
- Most lightweight option

**Installation:**
```bash
# Install Xvfb
sudo apt-get update
sudo apt-get install -y xvfb

# Install VS Code
wget https://update.code.visualstudio.com/latest/linux-deb-x64/stable -O vscode.deb
sudo dpkg -i vscode.deb
sudo apt-get install -f
```

**Running:**
```bash
# Start Xvfb on display :99
Xvfb :99 -screen 0 1024x768x24 &

# Set display environment variable
export DISPLAY=:99

# Start VS Code
code --no-sandbox /path/to/mcp-postgres
```

**Systemd Service (Auto-start on boot):**
```bash
sudo nano /etc/systemd/system/vscode-copilot.service
```

```ini
[Unit]
Description=VS Code with Copilot Bridge (Headless)
After=network.target

[Service]
Type=forking
User=youruser
WorkingDirectory=/path/to/mcp-postgres
Environment="DISPLAY=:99"

# Start Xvfb first
ExecStartPre=/bin/sh -c '/usr/bin/Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &'
ExecStartPre=/bin/sleep 2

# Start VS Code
ExecStart=/usr/bin/code --no-sandbox --user-data-dir=/home/youruser/.vscode-server /path/to/mcp-postgres

# Cleanup on stop
ExecStop=/usr/bin/pkill Xvfb

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable vscode-copilot
sudo systemctl start vscode-copilot
sudo systemctl status vscode-copilot
```

---

### Option 2: code-server (VS Code in Browser)

**What it is:**
- Open-source VS Code running in browser
- Created by Coder (https://github.com/coder/code-server)
- Access VS Code via web browser
- Extensions work normally

**Advantages:**
- Easy to access remotely
- No Xvfb needed
- Can manage from any device with browser
- Built-in authentication

**Installation:**
```bash
# Install code-server
curl -fsSL https://code-server.dev/install.sh | sh

# Configure
mkdir -p ~/.config/code-server
cat > ~/.config/code-server/config.yaml << EOF
bind-addr: 0.0.0.0:8080
auth: password
password: your-secure-password
cert: false
EOF

# Start code-server
code-server /path/to/mcp-postgres
```

**Access:**
- Open browser: `http://server-ip:8080`
- Enter password
- You see VS Code in browser
- Install extensions (GitHub Copilot, Copilot Web Bridge)
- Extension runs automatically

**Systemd Service:**
```ini
[Unit]
Description=code-server (VS Code in Browser)
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/mcp-postgres
ExecStart=/usr/bin/code-server /path/to/mcp-postgres
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Pros:**
- Easy remote access
- No virtual display needed
- Can troubleshoot visually

**Cons:**
- Uses more resources
- Extra port to secure (8080)
- Requires password management

---

### Option 3: SSH with X11 Forwarding

**What it does:**
- Forward VS Code GUI over SSH
- Display appears on your local machine
- Server runs VS Code, you see it locally

**Setup:**
```bash
# On server - install VS Code normally
sudo apt-get install code

# On your local machine - connect with X11 forwarding
ssh -X user@server

# Start VS Code (GUI appears on your screen)
code /path/to/mcp-postgres
```

**Pros:**
- Full GUI access
- Easy to manage extensions

**Cons:**
- Requires SSH connection to stay open
- Not suitable for 24/7 production
- Network latency affects performance

---

## GitHub Copilot Authentication on Server

### The Challenge:
GitHub Copilot requires browser authentication, which is tricky on headless servers.

### Solutions:

**Method 1: Authenticate Before Going Headless**
```bash
# On server with GUI or via SSH -X
code /path/to/mcp-postgres

# In VS Code:
# 1. Install GitHub Copilot extension
# 2. Click "Sign in to GitHub" in bottom right
# 3. Browser opens → authenticate
# 4. Close VS Code
# 5. Now start in headless mode - already authenticated
```

**Method 2: Settings Sync**
```bash
# On your local machine:
# 1. Sign in to GitHub Copilot
# 2. Enable Settings Sync (Cmd/Ctrl+Shift+P → "Settings Sync: Turn On")
# 3. Sign in with GitHub/Microsoft account

# On server:
# 1. Install VS Code
# 2. Enable Settings Sync
# 3. Sign in with same account
# 4. Extensions and auth automatically sync
```

**Method 3: code-server (Easiest)**
```bash
# Access code-server in browser: http://server-ip:8080
# Install GitHub Copilot from Extensions panel
# Click "Sign in" - works normally in browser
# Copilot Web Bridge extension auto-starts
```

---

## Complete Step-by-Step Setup (Linux Server)

### Prerequisites:
```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y curl wget git xvfb
```

### Step 1: Install VS Code
```bash
wget https://update.code.visualstudio.com/latest/linux-deb-x64/stable -O vscode.deb
sudo dpkg -i vscode.deb
sudo apt-get install -f -y
```

### Step 2: Initial Setup with Display
```bash
# Start Xvfb
Xvfb :99 -screen 0 1024x768x24 &
export DISPLAY=:99

# Start VS Code (first time)
code /path/to/mcp-postgres
```

### Step 3: Install GitHub Copilot
```bash
# Option A: Command line
code --install-extension GitHub.copilot

# Option B: Use Settings Sync (recommended)
# Sign in on local machine first, then sync on server
```

### Step 4: Authenticate GitHub Copilot

**If you have SSH with X11:**
```bash
# From local machine
ssh -X user@server
code /path/to/mcp-postgres
# Sign in to Copilot when prompted
```

**If completely headless:**
```bash
# 1. Copy authentication from local VS Code
# Files to copy from local ~/.config/Code/ or ~/Library/Application Support/Code/:
#    - User/globalStorage/github.copilot/
#    - User/globalStorage/github.copilot-chat/

# Or use Settings Sync (easier)
```

### Step 5: Install Copilot Web Bridge
```bash
cd /path/to/mcp-postgres
code --install-extension copilot-web-bridge/copilot-web-bridge-1.0.0.vsix
```

### Step 6: Configure Extension
```bash
# Create .vscode/settings.json
cat > /path/to/mcp-postgres/.vscode/settings.json << EOF
{
    "copilotWebBridge.port": 9001,
    "copilotWebBridge.mcpServerUrl": "http://localhost:3000",
    "copilotWebBridge.autoStart": true
}
EOF
```

### Step 7: Test Extension
```bash
# Start VS Code with workspace
DISPLAY=:99 code /path/to/mcp-postgres

# Check if extension loaded
# View → Output → Select "Copilot Web Bridge"

# Test the endpoint
curl http://localhost:9001/health
# Should return: {"status":"ok","copilotEnabled":true}
```

### Step 8: Create Systemd Service
```bash
sudo nano /etc/systemd/system/vscode-copilot.service
```

Paste the service configuration from Option 1 above.

```bash
sudo systemctl daemon-reload
sudo systemctl enable vscode-copilot
sudo systemctl start vscode-copilot

# Verify
sudo systemctl status vscode-copilot
lsof -i :9001
curl http://localhost:9001/health
```

---

## Troubleshooting

### Extension Not Loading
```bash
# Check VS Code logs
tail -f ~/.vscode-server/data/logs/*/console.log

# Check if workspace is open
ps aux | grep code | grep mcp-postgres

# Manually trigger extension
code --command "copilotWebBridge.start"
```

### Copilot Not Authenticated
```bash
# Check auth status in VS Code
code --command "github.copilot.status"

# Re-authenticate
# Use Settings Sync or SSH with X11 forwarding
```

### Xvfb Not Running
```bash
# Check if Xvfb is running
ps aux | grep Xvfb

# Start manually
Xvfb :99 -screen 0 1024x768x24 &

# Check display
echo $DISPLAY  # Should show :99
```

### Port 9001 Not Listening
```bash
# Check if extension is active
lsof -i :9001

# Check VS Code Output panel (if accessible)
# Or check logs
grep -r "Copilot Web Bridge" ~/.vscode-server/data/logs/

# Restart VS Code
pkill code
DISPLAY=:99 code /path/to/mcp-postgres
```

---

## Monitoring in Production

### Check All Components:
```bash
#!/bin/bash
# health-check.sh

echo "=== PostgreSQL Chatbot Health Check ==="

# MCP Server
echo -n "MCP Server (3000): "
curl -s http://localhost:3000/health | grep -q "running" && echo "✓ OK" || echo "✗ FAIL"

# Web Server
echo -n "Web Server (9000): "
curl -s http://localhost:9000/health | grep -q "healthy" && echo "✓ OK" || echo "✗ FAIL"

# Copilot Bridge
echo -n "Copilot Bridge (9001): "
curl -s http://localhost:9001/health | grep -q "ok" && echo "✓ OK" || echo "✗ FAIL"

# VS Code Process
echo -n "VS Code Process: "
pgrep -f "code.*mcp-postgres" > /dev/null && echo "✓ Running" || echo "✗ Not Running"

# Xvfb Process
echo -n "Xvfb Display: "
pgrep Xvfb > /dev/null && echo "✓ Running" || echo "✗ Not Running"

echo "==================================="
```

```bash
chmod +x health-check.sh
./health-check.sh
```

### Set up cron job to restart if fails:
```bash
crontab -e
```

```cron
# Check every 5 minutes
*/5 * * * * /path/to/health-check.sh | grep -q FAIL && systemctl restart vscode-copilot
```

---

## Resource Usage

**Expected Resource Consumption:**

| Component | CPU | Memory | Notes |
|-----------|-----|--------|-------|
| PostgreSQL | 1-5% | 100-500MB | Depends on queries |
| MCP Server | 1-2% | 50-100MB | Python FastAPI |
| Web Server | 0.5-1% | 30-50MB | Node.js |
| VS Code | 5-15% | 200-500MB | With Copilot |
| Xvfb | 0.5-1% | 20-50MB | Virtual display |
| **Total** | **8-25%** | **400MB-1.2GB** | |

**Recommendations:**
- Minimum: 2 CPU cores, 2GB RAM
- Recommended: 4 CPU cores, 4GB RAM
- Optimal: 4+ CPU cores, 8GB RAM

---

## Alternatives to Xvfb

### 1. VNC Server
```bash
# Install VNC
sudo apt-get install -y tightvncserver

# Start VNC
vncserver :1

# Set DISPLAY
export DISPLAY=:1
code /path/to/mcp-postgres
```

### 2. Xorg Dummy Driver
```bash
# Install dummy video driver
sudo apt-get install -y xserver-xorg-video-dummy

# Configure X to use dummy driver
# More stable than Xvfb for long-running
```

---

## Security Considerations

1. **VS Code Server**
   - Runs with user privileges (not root)
   - Only accessible from localhost by default
   - No external access to port 9001

2. **GitHub Copilot Token**
   - Stored in `~/.config/Code/User/globalStorage/`
   - Protected by file permissions
   - Rotates automatically

3. **Firewall Rules**
```bash
# Only allow port 9000 externally
sudo ufw allow 9000/tcp
sudo ufw deny 9001/tcp  # Copilot Bridge - internal only
sudo ufw deny 3000/tcp  # MCP Server - internal only
sudo ufw enable
```

---

## Summary

**For Production Linux Server, use Option 1 (Xvfb):**

✅ Lightweight
✅ Stable
✅ Auto-starts with systemd
✅ No browser needed
✅ Minimal resources

**Quick Commands:**
```bash
# Install
sudo apt-get install xvfb code

# Authenticate (one-time, use Settings Sync)
ssh -X server
code /path/to/mcp-postgres
# Sign in to Copilot

# Production (systemd service)
sudo systemctl start vscode-copilot
sudo systemctl enable vscode-copilot

# Monitor
curl http://localhost:9001/health
journalctl -u vscode-copilot -f
```

The extension will auto-start and keep running 24/7, processing chat requests from the web interface.
