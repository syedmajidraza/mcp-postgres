#!/bin/bash
# TRUE HEADLESS MODE - No VS Code window at all!
# Uses standalone Node.js Copilot Bridge instead of VS Code extension
#
# Prerequisites:
# - You must have authenticated GitHub Copilot in VS Code at least once
# - The token will be reused from: ~/Library/Application Support/Code/User/globalStorage/github.copilot/

echo "🚀 PostgreSQL Chatbot - TRUE HEADLESS MODE"
echo "=============================================="
echo "No VS Code window will open - using standalone Copilot Bridge"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if Copilot credentials exist
COPILOT_CREDS="$HOME/Library/Application Support/Code/User/globalStorage/github.copilot"
if [ ! -d "$COPILOT_CREDS" ]; then
    echo "❌ GitHub Copilot credentials not found!"
    echo ""
    echo "You need to authenticate GitHub Copilot first:"
    echo "1. Open VS Code normally: open -a 'Visual Studio Code'"
    echo "2. Install GitHub Copilot extension if not installed"
    echo "3. Sign in to GitHub Copilot (Cmd+Shift+P → 'Copilot: Sign In')"
    echo "4. Close VS Code"
    echo "5. Run this script again"
    echo ""
    exit 1
fi

echo "✅ GitHub Copilot credentials found"
echo ""

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

# Step 2: Start Standalone Copilot Bridge (NO VS Code needed!)
echo "2️⃣  Starting Standalone Copilot Bridge (port 9001)..."
if lsof -i :9001 > /dev/null 2>&1; then
    echo "   ⚠️  Port 9001 in use, stopping existing process..."
    lsof -ti:9001 | xargs kill -9 2>/dev/null
    sleep 2
fi

chmod +x copilot-bridge-standalone.js
node copilot-bridge-standalone.js > /tmp/copilot-bridge.log 2>&1 &
BRIDGE_PID=$!
sleep 3

if curl -s http://localhost:9001/health | grep -q "ok"; then
    echo "   ✅ Copilot Bridge started (PID: $BRIDGE_PID)"
    echo "   ✅ Running WITHOUT VS Code - true headless!"
else
    echo "   ❌ Copilot Bridge failed to start"
    echo "   Check logs: tail /tmp/copilot-bridge.log"
    exit 1
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
echo "=============================================="
echo "📊 Service Status"
echo "=============================================="
echo ""

MCP_STATUS=$(curl -s http://localhost:3000/health > /dev/null 2>&1 && echo '✅ Running' || echo '❌ Not Running')
COPILOT_STATUS=$(curl -s http://localhost:9001/health > /dev/null 2>&1 && echo '✅ Running' || echo '❌ Not Running')
WEB_STATUS=$(curl -s http://localhost:9000/health > /dev/null 2>&1 && echo '✅ Running' || echo '❌ Not Running')

echo "MCP Server (3000):      $MCP_STATUS"
echo "Copilot Bridge (9001):  $COPILOT_STATUS (standalone, no VS Code)"
echo "Web Server (9000):      $WEB_STATUS"

echo ""

# Check if all services are running
if [[ "$MCP_STATUS" == *"Running"* ]] && [[ "$COPILOT_STATUS" == *"Running"* ]] && [[ "$WEB_STATUS" == *"Running"* ]]; then
    echo "=============================================="
    echo "✅ TRUE HEADLESS MODE ACTIVE!"
    echo "=============================================="
    echo ""
    echo "🌐 Chatbot Interface: http://localhost:9000"
    echo ""
    echo "💡 All services running WITHOUT VS Code:"
    echo "   • No VS Code window"
    echo "   • No Dock icon"
    echo "   • Standalone Copilot Bridge using cached credentials"
    echo "   • All processes running as background daemons"
    echo ""
    echo "📱 Opening chatbot in your browser..."
    sleep 1
    open http://localhost:9000
    echo ""
    echo "🛑 To stop all services: ./stop-all.sh"
    echo ""
    echo "📋 Service Logs:"
    echo "   MCP Server:         tail -f /tmp/mcp-server.log"
    echo "   Copilot Bridge:     tail -f /tmp/copilot-bridge.log"
    echo "   Web Server:         tail -f /tmp/web-server.log"
    echo ""
    echo "🔍 Process Monitoring:"
    echo "   ps aux | grep -E '(server.py|copilot-bridge|web-server)'"
    echo ""
else
    echo "=============================================="
    echo "⚠️  Some Services Failed to Start"
    echo "=============================================="
    echo ""
    if [[ "$MCP_STATUS" == *"Not Running"* ]]; then
        echo "❌ MCP Server not running"
        echo "   Check: tail /tmp/mcp-server.log"
    fi
    if [[ "$COPILOT_STATUS" == *"Not Running"* ]]; then
        echo "❌ Copilot Bridge not running"
        echo "   Check: tail /tmp/copilot-bridge.log"
    fi
    if [[ "$WEB_STATUS" == *"Not Running"* ]]; then
        echo "❌ Web Server not running"
        echo "   Check: tail /tmp/web-server.log"
    fi
    echo ""
fi
