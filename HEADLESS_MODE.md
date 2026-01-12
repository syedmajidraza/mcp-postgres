# True Headless Mode Guide

This guide explains how to run the PostgreSQL Chatbot in **TRUE HEADLESS MODE** - no VS Code window, no Dock icon, just background services.

## Table of Contents

- [Overview](#overview)
- [Two Deployment Modes](#two-deployment-modes)
- [Prerequisites](#prerequisites)
- [Quick Start - True Headless](#quick-start---true-headless)
- [How It Works](#how-it-works)
- [Comparison: Minimized vs Headless](#comparison-minimized-vs-headless)
- [GitHub Copilot Authentication](#github-copilot-authentication)
- [Monitoring & Troubleshooting](#monitoring--troubleshooting)
- [Server Deployment](#server-deployment)

---

## Overview

The PostgreSQL Chatbot can run in two modes:

1. **Minimized Mode** - VS Code window minimized in Dock (original approach)
2. **True Headless Mode** - No VS Code at all, standalone Node.js Copilot Bridge

**True Headless Mode** is the recommended approach for server deployments and when you don't want any VS Code presence.

---

## Two Deployment Modes

### Mode 1: Minimized Mode (VS Code Extension)

```bash
./start-all.sh
```

**What happens:**
- Opens VS Code with workspace
- Minimizes window to Dock using AppleScript
- VS Code Copilot Web Bridge extension runs on port 9001
- You'll see VS Code icon in Dock (minimized)

**Pros:**
- Uses official VS Code extension
- Easier to debug (can un-minimize window)
- Full VS Code environment available

**Cons:**
- Requires VS Code GUI to be running
- Window visible in Dock
- Uses more memory (entire VS Code runtime)
- Not truly "headless"

---

### Mode 2: True Headless (Standalone Bridge)

```bash
./start-truly-headless.sh
```

**What happens:**
- Starts MCP Server (Python)
- Starts Standalone Copilot Bridge (Node.js) - **NO VS CODE**
- Starts Web Server
- All run as background processes

**Pros:**
- ✅ No VS Code window at all
- ✅ No Dock icon
- ✅ Lower memory usage
- ✅ Perfect for servers
- ✅ True headless operation

**Cons:**
- Requires one-time Copilot authentication in VS Code
- Slightly more complex architecture
- Can't use VS Code debugger directly

---

## Prerequisites

### For True Headless Mode

You must authenticate GitHub Copilot in VS Code **once** before using headless mode:

```bash
# 1. Open VS Code normally
open -a "Visual Studio Code"

# 2. Install GitHub Copilot extension (if not already installed)
#    Cmd+Shift+P → "Extensions: Install Extensions" → Search "GitHub Copilot"

# 3. Sign in to GitHub Copilot
#    Cmd+Shift+P → "Copilot: Sign In"
#    Follow the browser authentication flow

# 4. Verify authentication worked
#    You should see "Copilot: Ready" in VS Code status bar

# 5. Close VS Code
#    The credentials are now saved on disk

# 6. Run headless mode
./start-truly-headless.sh
```

**Where credentials are stored:**
```
~/Library/Application Support/Code/User/globalStorage/github.copilot/
```

These credentials are reused by the standalone Copilot Bridge without needing VS Code.

---

## Quick Start - True Headless

### Step 1: Authenticate Copilot (one-time)

```bash
# Open VS Code and sign in to Copilot
open -a "Visual Studio Code"

# In VS Code: Cmd+Shift+P → "Copilot: Sign In"
# Follow authentication flow, then close VS Code
```

### Step 2: Start Headless Services

```bash
cd /Users/syedraza/mcp-postgres
./start-truly-headless.sh
```

### Step 3: Use the Chatbot

Your browser will automatically open to `http://localhost:9000`

**That's it!** No VS Code window, no Dock icon, just the chatbot.

---

## How It Works

### Architecture: True Headless Mode

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                   http://localhost:9000                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Web Server (Node.js)                       │
│                        Port 9000                             │
│   • Serves HTML/CSS/JS chatbot UI                           │
│   • Proxies requests to Copilot Bridge                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         Standalone Copilot Bridge (Node.js)                  │
│                    Port 9001                                 │
│   • Loads Copilot token from VS Code storage                │
│   • Calls GitHub Copilot API directly                       │
│   • No VS Code process needed!                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌──────────────────┐      ┌──────────────────────────┐
│  GitHub Copilot  │      │   MCP Server (Python)    │
│       API        │      │      Port 3000           │
│   (OpenAI GPT)   │      │  • PostgreSQL connector  │
└──────────────────┘      │  • 8 database tools      │
                          └────────┬─────────────────┘
                                   ▼
                          ┌──────────────────────────┐
                          │   PostgreSQL Database    │
                          │   Adventureworks:5431    │
                          └──────────────────────────┘
```

### Key Components

#### 1. Standalone Copilot Bridge (`copilot-bridge-standalone.js`)

**Replaces the VS Code extension entirely!**

```javascript
// Loads token from disk (no VS Code needed)
const credentialsPath = path.join(
    os.homedir(),
    'Library/Application Support/Code/User/globalStorage/github.copilot'
);

// Makes direct API calls to GitHub Copilot
const response = await fetch('https://api.githubcopilot.com/chat/completions', {
    headers: {
        'Authorization': `Bearer ${copilotToken}`
    }
});
```

**What it does:**
1. Reads Copilot credentials from VS Code's storage directory
2. Provides HTTP endpoints: `/health`, `/chat`
3. Forwards chat requests to GitHub Copilot API
4. Calls MCP tools when needed
5. Returns results to web server

#### 2. MCP Server (Python)

Same as before - provides PostgreSQL database tools:
- `query_database`, `execute_sql`, `list_tables`, etc.

#### 3. Web Server (Node.js)

Same as before - serves chatbot UI and proxies requests

---

## Comparison: Minimized vs Headless

| Feature | Minimized Mode | True Headless |
|---------|----------------|---------------|
| VS Code Process | ✅ Running (minimized) | ❌ Not running |
| Dock Icon | ⚠️ Visible (minimized) | ✅ None |
| Memory Usage | ~500MB (VS Code) | ~100MB (Node.js) |
| Startup Time | 10-15 seconds | 3-5 seconds |
| Copilot Auth | Automatic | One-time setup |
| Debugging | Easy (open window) | Logs only |
| Server Deployment | Not ideal | ✅ Perfect |
| Stability | Very stable | Stable |

---

## GitHub Copilot Authentication

### How Authentication Works

GitHub Copilot authentication is a **one-time setup**:

1. **Initial Authentication (in VS Code)**
   ```
   User opens VS Code → Signs in to Copilot → Token saved to disk
   ```

2. **Token Storage**
   ```
   ~/Library/Application Support/Code/User/globalStorage/github.copilot/
   └── user-xxx-xxx-xxx (JSON file with oauth_token)
   ```

3. **Headless Mode Reuses Token**
   ```
   Standalone Bridge reads token from disk → Calls Copilot API directly
   ```

### Verifying Authentication

```bash
# Check if credentials exist
ls -la ~/Library/Application\ Support/Code/User/globalStorage/github.copilot/

# Should show files like:
# user-xxx-xxx-xxx
```

### Re-authenticating

If the token expires or you need to re-authenticate:

```bash
# 1. Open VS Code
open -a "Visual Studio Code"

# 2. Sign out and sign in again
#    Cmd+Shift+P → "Copilot: Sign Out"
#    Cmd+Shift+P → "Copilot: Sign In"

# 3. Close VS Code and restart headless mode
./start-truly-headless.sh
```

---

## Monitoring & Troubleshooting

### Check Service Status

```bash
# Quick health check
curl http://localhost:3000/health  # MCP Server
curl http://localhost:9001/health  # Copilot Bridge
curl http://localhost:9000/health  # Web Server

# Check running processes
ps aux | grep -E '(server.py|copilot-bridge|web-server)'

# Check ports
lsof -i :3000  # MCP Server
lsof -i :9001  # Copilot Bridge
lsof -i :9000  # Web Server
```

### View Logs

```bash
# Real-time logs
tail -f /tmp/mcp-server.log
tail -f /tmp/copilot-bridge.log
tail -f /tmp/web-server.log

# View all logs together
tail -f /tmp/mcp-server.log /tmp/copilot-bridge.log /tmp/web-server.log
```

### Common Issues

#### Issue: "GitHub Copilot credentials not found"

**Cause:** You haven't authenticated Copilot in VS Code yet

**Solution:**
```bash
# Authenticate once in VS Code
open -a "Visual Studio Code"
# Cmd+Shift+P → "Copilot: Sign In"
# Close VS Code and try again
```

#### Issue: "Copilot Bridge failed to start"

**Cause:** Token might be expired or invalid

**Solution:**
```bash
# Check logs
tail /tmp/copilot-bridge.log

# Re-authenticate in VS Code
open -a "Visual Studio Code"
# Cmd+Shift+P → "Copilot: Sign Out" then "Copilot: Sign In"
```

#### Issue: "Port already in use"

**Cause:** Previous process still running

**Solution:**
```bash
# Stop all services
./stop-all.sh

# Or manually kill processes
lsof -ti:9001 | xargs kill -9
lsof -ti:9000 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Restart
./start-truly-headless.sh
```

### Performance Monitoring

```bash
# Memory usage
ps aux | grep -E '(server.py|copilot-bridge|web-server)' | awk '{print $4, $11}'

# Process tree
pstree -p $$ | grep -E '(python|node)'

# Network connections
netstat -an | grep -E '(3000|9000|9001)'
```

---

## Server Deployment

### Deploying on Remote Server

True headless mode is **perfect for server deployment**:

```bash
# 1. On your local Mac (one-time):
#    Authenticate Copilot in VS Code to get credentials

# 2. Copy credentials to server
scp -r ~/Library/Application\ Support/Code/User/globalStorage/github.copilot/ \
    user@server:/home/user/.copilot-credentials/

# 3. On server: Update standalone bridge to look in new location
#    Edit copilot-bridge-standalone.js:
#    const credentialsPath = '/home/user/.copilot-credentials';

# 4. Start services on server
ssh user@server
cd /path/to/mcp-postgres
./start-truly-headless.sh
```

### Running as System Service (Linux)

Create systemd service for automatic startup:

```bash
# /etc/systemd/system/postgres-chatbot.service
[Unit]
Description=PostgreSQL Chatbot - Headless Mode
After=network.target postgresql.service

[Service]
Type=forking
User=youruser
WorkingDirectory=/home/youruser/mcp-postgres
ExecStart=/home/youruser/mcp-postgres/start-truly-headless.sh
ExecStop=/home/youruser/mcp-postgres/stop-all.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable postgres-chatbot
sudo systemctl start postgres-chatbot
sudo systemctl status postgres-chatbot
```

### macOS LaunchAgent (Auto-start on Login)

Create `~/Library/LaunchAgents/com.postgres.chatbot.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.postgres.chatbot</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/syedraza/mcp-postgres/start-truly-headless.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/chatbot-launch.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/chatbot-launch-error.log</string>
</dict>
</plist>
```

Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.postgres.chatbot.plist
launchctl start com.postgres.chatbot
```

Now the chatbot starts automatically when you log in!

---

## Security Considerations

### Credential Storage

GitHub Copilot credentials are stored in:
```
~/Library/Application Support/Code/User/globalStorage/github.copilot/
```

**Security notes:**
- These are OAuth tokens with limited scope
- They expire after a period of time
- They're specific to your GitHub account
- Protect them like passwords

### Network Security

All services bind to `127.0.0.1` (localhost only):
- Not accessible from other machines
- Safe for development

For production deployment:
- Use nginx reverse proxy with SSL
- Add authentication (OAuth, Basic Auth, etc.)
- Use firewall rules
- See [DEPLOYMENT.md](DEPLOYMENT.md) for details

---

## Summary

**Use True Headless Mode when:**
- ✅ Deploying to a server
- ✅ You don't want VS Code visible
- ✅ You want minimal memory usage
- ✅ You want fast startup times

**Use Minimized Mode when:**
- ✅ You're developing/debugging
- ✅ You need VS Code extensions
- ✅ You want easier troubleshooting

**Both modes provide the same chatbot functionality!**

---

## Quick Reference

### Start Services
```bash
# True headless (no VS Code)
./start-truly-headless.sh

# Minimized mode (VS Code minimized)
./start-all.sh
```

### Stop Services
```bash
./stop-all.sh
```

### Check Status
```bash
curl http://localhost:9000/health
```

### View Logs
```bash
tail -f /tmp/copilot-bridge.log
```

### Chatbot URL
```
http://localhost:9000
```

---

For more details, see:
- [RUNNING_IN_BACKGROUND.md](RUNNING_IN_BACKGROUND.md) - Background service details
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [README.md](README.md) - Main documentation
