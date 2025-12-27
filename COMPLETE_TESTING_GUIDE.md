# ✅ Complete Testing Guide - Full Extension Ready!

## ✅ Everything is Ready!

### 1. MCP Registry (Running)
- ✅ Backend: http://localhost:8000
- ✅ Frontend: http://localhost:3001
- ✅ PostgreSQL MCP v1.0.0 published

### 2. Full VS Code Extension (Built & Installed)
- ✅ File: `mcp-server-manager-1.0.0.vsix`
- ✅ Installed in VS Code
- ✅ **Full implementation with all features!**

---

## 🎯 Test the Complete Extension Now!

### Step 1: Open VS Code

```bash
code .
```

Or just open VS Code normally.

### Step 2: Find the Extension

Look for the **MCP Servers** icon in the Activity Bar (left sidebar). It should look like a server icon.

If you don't see it:
1. Press `Cmd+Shift+X` (Extensions view)
2. Search for "MCP Server Manager"
3. You should see it installed

### Step 3: Click MCP Servers Icon

You'll see TWO panels:

```
MCP SERVERS
├── Registry              ← Browse available servers
│   └── postgres-mcp v1.0.0
└── Installed             ← Your installed servers
    (empty initially)
```

### Step 4: Install postgres-mcp

1. **In Registry panel**: You should see `postgres-mcp v1.0.0`
2. **Hover over it**: A download icon appears
3. **Click the download icon** (cloud-download)
4. **Watch the progress**:
   - "Installing postgres-mcp..."
   - "Downloading..."
   - "Done!"

5. **Check Installed panel**: postgres-mcp should now appear!

### Step 5: Configure postgres-mcp

1. **In Installed panel**: Find `postgres-mcp (stopped)`
2. **Click the gear icon** (settings)
3. **Enter configuration**:
   - DB_HOST: `localhost`
   - DB_PORT: `5431`
   - DB_NAME: `Adventureworks`
   - DB_USER: `postgres`
   - DB_PASSWORD: `postgres`
   - Press Enter to skip remaining fields

4. **See confirmation**: "✓ Configuration saved for postgres-mcp"

### Step 6: Start the Server

1. **In Installed panel**: Find `postgres-mcp (stopped)`
2. **Click the play icon** (▶️)
3. **Watch the output**:
   - Output panel opens automatically
   - Shows: "✓ Started postgres-mcp"
   - Server logs appear

4. **Status changes**: `postgres-mcp (● Running)`

### Step 7: View Logs

1. **Right-click** on `postgres-mcp (● Running)`
2. **Select**: "MCP: View Server Logs"
3. **See logs** in new panel

### Step 8: Stop the Server

1. **Click the stop icon** (⏹️) next to postgres-mcp
2. **See confirmation**: "✓ Stopped postgres-mcp"
3. **Status changes back to**: `postgres-mcp (○ Stopped)`

---

## 🎬 Full Workflow Test

### Complete Test Scenario

```
1. Open VS Code
2. Click MCP Servers icon
3. See "Registry" section with postgres-mcp
4. Click download icon → Install
5. Click gear icon → Configure (DB credentials)
6. Click play icon → Start
7. Right-click → View Logs (verify it's running)
8. Click stop icon → Stop
9. Right-click → Uninstall (optional cleanup)
```

---

## 🔍 What to Look For

### Registry Panel Should Show:
```
Registry
└── 📦 postgres-mcp v1.0.0
    PostgreSQL database operations via MCP...
```

### After Install, Installed Panel Shows:
```
Installed
└── 📦 postgres-mcp (○ Stopped)
```

### After Start, Shows:
```
Installed
└── 📦 postgres-mcp (● Running)
```

### Context Menu Options:
**Right-click on stopped server:**
- ▶️ MCP: Start Server
- ⚙️ MCP: Configure Server
- 📋 MCP: View Server Logs
- 🗑️ MCP: Uninstall Server

**Right-click on running server:**
- ⏹️ MCP: Stop Server
- 🔄 MCP: Restart Server
- ⚙️ MCP: Configure Server
- 📋 MCP: View Server Logs
- 🗑️ MCP: Uninstall Server

---

## 🎨 Visual Guide

### 1. Initial State
```
┌─────────────────────────────┐
│ MCP SERVERS                  │
├─────────────────────────────┤
│ Registry          🔄 🔍     │
│ ├─ postgres-mcp v1.0.0 ⬇️   │
│ │   PostgreSQL database...  │
│                              │
│ Installed                    │
│ (empty)                      │
└─────────────────────────────┘
```

### 2. After Installation
```
┌─────────────────────────────┐
│ MCP SERVERS                  │
├─────────────────────────────┤
│ Registry          🔄 🔍     │
│ ├─ postgres-mcp v1.0.0 ⬇️   │
│                              │
│ Installed                    │
│ ├─ postgres-mcp (○ Stopped)▶️⚙️│
└─────────────────────────────┘
```

### 3. After Starting
```
┌─────────────────────────────┐
│ MCP SERVERS                  │
├─────────────────────────────┤
│ Registry          🔄 🔍     │
│ ├─ postgres-mcp v1.0.0 ⬇️   │
│                              │
│ Installed                    │
│ ├─ postgres-mcp (● Running) ⏹️⚙️│
└─────────────────────────────┘
```

---

## 🚀 Advanced Features

### Search Registry
1. Click search icon (🔍) in Registry panel
2. Enter: "postgres"
3. Registry filters to show matches

### Refresh Registry
1. Click refresh icon (🔄) in Registry panel
2. Reloads latest servers from registry

### Server Details
1. In Registry panel, click postgres-mcp
2. See detailed info panel open

### Start All / Stop All
1. Right-click in "Installed" panel header
2. Select "MCP: Start All Servers" or "MCP: Stop All Servers"

---

## 🐛 Troubleshooting

### Extension Not Showing
```bash
# Reload VS Code
Cmd+Shift+P → "Developer: Reload Window"

# Or restart VS Code completely
```

### Registry Panel Empty
```bash
# Check registry is running
curl http://localhost:8000

# Set registry URL
Cmd+Shift+P → "MCP: Set Registry URL"
Enter: http://localhost:8000
```

### Install Fails
```bash
# Check Output panel for errors
View → Output → Select "MCP Server Manager"

# Common issues:
# 1. Python not installed: brew install python3
# 2. Network issue: check registry URL
# 3. Permissions: check ~/.mcp-servers/ is writable
```

### Server Won't Start
```bash
# View logs
Right-click server → "MCP: View Server Logs"

# Common issues:
# 1. Not configured: Click gear icon first
# 2. Port in use: Check another instance isn't running
# 3. DB connection: Verify DB credentials
```

---

## ✅ Success Checklist

- [ ] VS Code shows MCP Servers icon in sidebar
- [ ] Clicking icon shows Registry and Installed panels
- [ ] Registry panel shows postgres-mcp v1.0.0
- [ ] Download icon appears on hover
- [ ] Clicking download installs to Installed panel
- [ ] Gear icon opens configuration dialog
- [ ] Play icon starts the server
- [ ] Status changes to "● Running"
- [ ] Logs are visible in Output panel
- [ ] Stop icon stops the server
- [ ] Right-click menu shows all options

---

## 📊 What's Installed

Check installed location:
```bash
ls -la ~/.mcp-servers/
# Should show: postgres-mcp/

ls -la ~/.mcp-servers/postgres-mcp/
# Should show:
# - server.py
# - requirements.txt
# - config.py
# - venv/
# - README.md
# - .env.example
```

---

## 🎉 Next Steps

After testing the extension:

1. **Use with your MCP client**:
   - Install in Claude Desktop
   - Or use with Cline/Continue/Cursor
   - Configure to point to `~/.mcp-servers/postgres-mcp/`

2. **Publish more servers**:
   ```bash
   cd /path/to/your/mcp-server
   tar -czf server.tar.gz .
   curl -X POST http://localhost:8000/api/v1/publish \
     -F "package=@server.tar.gz" \
     -F "name=my-server" \
     -F "version=1.0.0" \
     -F "description=My MCP server" \
     -F "tags=custom"
   ```

3. **Share with your team**:
   - Share `mcp-server-manager-1.0.0.vsix`
   - Share registry URL
   - Team installs and starts using!

---

## 🎯 Quick Test Commands

```bash
# Verify everything
curl http://localhost:8000/api/v1/servers | python3 -m json.tool  # Should show postgres-mcp
ls -la ~/.mcp-servers/  # Check install directory
code .  # Open VS Code and test!
```

**Everything should work perfectly now!** 🎉
