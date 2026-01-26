#!/bin/bash
# Start PostgreSQL Chatbot with VS Code completely hidden
# VS Code runs in background - invisible but working

echo "🚀 PostgreSQL Chatbot - Hidden VS Code Mode"
echo "=============================================="
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Step 1: Start MCP Server
echo "1️⃣  Starting MCP Server (port 3000)..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ⚠️  Already running"
else
    cd mcp-server
    /usr/local/Caskroom/miniconda/base/bin/python3 server.py > /tmp/mcp-server.log 2>&1 &
    cd ..
    sleep 2
    echo "   ✅ Started"
fi

# Step 2: Start VS Code hidden (if not already running)
echo "2️⃣  Starting VS Code (hidden in background)..."
if lsof -i :9001 > /dev/null 2>&1; then
    echo "   ⚠️  Copilot Bridge already running"
else
    # Open VS Code
    open -a "Visual Studio Code" "$SCRIPT_DIR"
    sleep 3
    
    # Hide VS Code completely (minimize + hide from Dock)
    osascript << 'APPLESCRIPT'
    tell application "System Events"
        tell process "Code"
            set visible to false
        end tell
    end tell
    tell application "Visual Studio Code"
        set miniaturized of every window to true
    end tell
APPLESCRIPT
    
    # Wait for extension to start
    sleep 5
    
    if lsof -i :9001 > /dev/null 2>&1; then
        echo "   ✅ VS Code running (hidden)"
    else
        echo "   ⏳ Waiting for Copilot Bridge..."
        sleep 5
    fi
fi

# Step 3: Start Web Server
echo "3️⃣  Starting Web Server (port 9000)..."
if lsof -i :9000 > /dev/null 2>&1; then
    echo "   ⚠️  Already running"
else
    node web-server.js > /tmp/web-server.log 2>&1 &
    sleep 2
    echo "   ✅ Started"
fi

echo ""
echo "=============================================="
echo "📊 Status Check"
echo "=============================================="

MCP=$(curl -s http://localhost:3000/health 2>/dev/null && echo " ✅" || echo " ❌")
COPILOT=$(curl -s http://localhost:9001/health 2>/dev/null && echo " ✅" || echo " ❌")
WEB=$(curl -s http://localhost:9000/health 2>/dev/null && echo " ✅" || echo " ❌")

echo "MCP Server (3000):     $MCP"
echo "Copilot Bridge (9001): $COPILOT"
echo "Web Server (9000):     $WEB"

echo ""
echo "=============================================="
echo "✅ Ready!"
echo "=============================================="
echo ""
echo "🌐 Open: http://localhost:9000"
echo ""
echo "💡 VS Code is running HIDDEN in background"
echo "   • Not visible in windows"
echo "   • Minimized to Dock (click to unhide if needed)"
echo "   • DO NOT QUIT VS Code or chatbot stops"
echo ""
echo "🛑 To stop: ./stop-all.sh"
echo ""

# Open browser
open http://localhost:9000
