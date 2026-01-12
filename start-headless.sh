#!/bin/bash
# Start all PostgreSQL Chatbot services with VS Code in TRUE HEADLESS mode
# No visible windows, no Dock icon - everything runs as background processes

echo "🚀 PostgreSQL Chatbot - Headless Mode Startup"
echo "=================================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Kill any existing VS Code processes to start fresh
echo "🧹 Cleaning up any existing VS Code processes..."
pkill -f "Visual Studio Code" 2>/dev/null || true
pkill -f "code --" 2>/dev/null || true
sleep 2

# Step 1: Start MCP Server
echo "1️⃣  Starting MCP Server (port 3000)..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ⚠️  Port 3000 in use, stopping existing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 2
fi

cd mcp-server
/usr/local/Caskroom/miniconda/base/bin/python3 server.py > /tmp/mcp-server.log 2>&1 &
MCP_PID=$!
cd ..
sleep 3

if curl -s http://localhost:3000/health | grep -q "running"; then
    echo "   ✅ MCP Server started (PID: $MCP_PID)"
else
    echo "   ❌ MCP Server failed to start"
    echo "   Check logs: tail /tmp/mcp-server.log"
    exit 1
fi
echo ""

# Step 2: Start VS Code in TRUE HEADLESS mode (tunnel/serve mode)
echo "2️⃣  Starting VS Code in HEADLESS mode (no window, no Dock)..."
if lsof -i :9001 > /dev/null 2>&1; then
    echo "   ⚠️  Port 9001 in use, stopping existing process..."
    lsof -ti:9001 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Use VS Code tunnel or serve mode for true headless operation
# This runs VS Code backend without any UI
echo "   Starting VS Code tunnel server in background..."

# Check if code command is available
if ! command -v code &> /dev/null; then
    echo "   ❌ VS Code 'code' command not found in PATH"
    echo "   Run this in VS Code: Cmd+Shift+P → 'Shell Command: Install code command in PATH'"
    exit 1
fi

# Start VS Code with extensions host running but no window
# Using --extensionDevelopmentPath to load our extension in headless mode
nohup code serve-local \
    --host 127.0.0.1 \
    --port 8000 \
    --folder "$SCRIPT_DIR" \
    --extensions-dir "$HOME/.vscode/extensions" \
    --user-data-dir "$HOME/Library/Application Support/Code" \
    > /tmp/vscode-headless.log 2>&1 &

VSCODE_PID=$!
echo "   VS Code headless started (PID: $VSCODE_PID)"
echo "   Waiting for extension to activate (15 seconds)..."
sleep 15

# Check if Copilot Bridge extension started
if curl -s http://localhost:9001/health | grep -q "ok"; then
    echo "   ✅ Copilot Bridge extension activated"
else
    echo "   ⚠️  Copilot Bridge not responding yet, trying alternate method..."
    echo ""
    echo "   ℹ️  FALLBACK: Starting VS Code minimized (AppleScript method)"

    # Kill the headless attempt
    kill $VSCODE_PID 2>/dev/null

    # Fall back to minimized window approach
    open -a "Visual Studio Code" "$SCRIPT_DIR"
    sleep 10

    # Minimize the window
    osascript <<'EOF' 2>/dev/null
tell application "Visual Studio Code"
    set miniaturized of every window to true
end tell
tell application "System Events"
    tell process "Visual Studio Code"
        set visible to false
    end tell
end tell
EOF

    sleep 5

    if curl -s http://localhost:9001/health | grep -q "ok"; then
        echo "   ✅ Copilot Bridge started (minimized window method)"
    else
        echo "   ❌ Copilot Bridge failed to start"
        echo ""
        echo "   Manual steps needed:"
        echo "   1. Un-minimize VS Code from Dock"
        echo "   2. Press Cmd+Shift+P"
        echo "   3. Type: 'Copilot Web Bridge: Start Server'"
        echo "   4. Check View → Output → 'Copilot Web Bridge'"
    fi
fi
echo ""

# Step 3: Start Web Server
echo "3️⃣  Starting Web Server (port 9000)..."
if lsof -i :9000 > /dev/null 2>&1; then
    echo "   ⚠️  Port 9000 in use, stopping existing process..."
    lsof -ti:9000 | xargs kill -9 2>/dev/null
    sleep 2
fi

node web-server.js > /tmp/web-server.log 2>&1 &
WEB_PID=$!
sleep 3

if curl -s http://localhost:9000/health | grep -q "healthy"; then
    echo "   ✅ Web Server started (PID: $WEB_PID)"
else
    echo "   ❌ Web Server failed to start"
    echo "   Check logs: tail /tmp/web-server.log"
    exit 1
fi
echo ""

# Final status check
echo "=================================================="
echo "📊 Service Status Check"
echo "=================================================="
echo ""

MCP_STATUS=$(curl -s http://localhost:3000/health > /dev/null 2>&1 && echo '✅ Running' || echo '❌ Not Running')
COPILOT_STATUS=$(curl -s http://localhost:9001/health > /dev/null 2>&1 && echo '✅ Running' || echo '❌ Not Running')
WEB_STATUS=$(curl -s http://localhost:9000/health > /dev/null 2>&1 && echo '✅ Running' || echo '❌ Not Running')

echo "MCP Server (3000):      $MCP_STATUS"
echo "Copilot Bridge (9001):  $COPILOT_STATUS"
echo "Web Server (9000):      $WEB_STATUS"

echo ""

# Check if all services are running
if [[ "$MCP_STATUS" == *"Running"* ]] && [[ "$COPILOT_STATUS" == *"Running"* ]] && [[ "$WEB_STATUS" == *"Running"* ]]; then
    echo "=================================================="
    echo "✅ All Services Running in HEADLESS Mode!"
    echo "=================================================="
    echo ""
    echo "🌐 Chatbot Interface: http://localhost:9000"
    echo ""
    echo "📱 Opening chatbot in your browser..."
    sleep 1
    open http://localhost:9000
    echo ""
    echo "💡 All services running in background:"
    echo "   • No visible windows"
    echo "   • No Dock icons (or minimized if fallback used)"
    echo "   • All processes running as background daemons"
    echo ""
    echo "🛑 To stop all services: ./stop-all.sh"
    echo ""
    echo "📋 Service Logs:"
    echo "   MCP Server:      tail -f /tmp/mcp-server.log"
    echo "   VS Code:         tail -f /tmp/vscode-headless.log"
    echo "   Web Server:      tail -f /tmp/web-server.log"
    echo ""
    echo "🔍 Process Monitoring:"
    echo "   ps aux | grep -E '(mcp-server|node web-server|Visual Studio Code)'"
    echo ""
else
    echo "=================================================="
    echo "⚠️  Some Services Failed to Start"
    echo "=================================================="
    echo ""
    if [[ "$MCP_STATUS" == *"Not Running"* ]]; then
        echo "❌ MCP Server not running"
        echo "   Check: tail /tmp/mcp-server.log"
    fi
    if [[ "$COPILOT_STATUS" == *"Not Running"* ]]; then
        echo "❌ Copilot Bridge not running"
        echo "   Check: tail /tmp/vscode-headless.log"
    fi
    if [[ "$WEB_STATUS" == *"Not Running"* ]]; then
        echo "❌ Web Server not running"
        echo "   Check: tail /tmp/web-server.log"
    fi
    echo ""
fi
