#!/bin/bash
# Start VS Code headless on macOS
# This keeps VS Code running in the background without showing the window

echo "🚀 Starting VS Code in headless mode..."

# Kill any existing VS Code instances
echo "Stopping existing VS Code instances..."
osascript -e 'quit app "Visual Studio Code"' 2>/dev/null
sleep 2

# Start VS Code in background without opening window
echo "Starting VS Code with Copilot Bridge extension..."
code --no-sandbox --user-data-dir=/Users/syedraza/.vscode-headless /Users/syedraza/mcp-postgres &

# Wait for VS Code to start
sleep 5

# Check if Copilot Bridge started on port 9001
echo "Checking Copilot Bridge..."
if lsof -i :9001 > /dev/null 2>&1; then
    echo "✅ Copilot Bridge is running on port 9001"
    curl -s http://localhost:9001/health | grep -q "ok" && echo "✅ Copilot Bridge health check passed"
else
    echo "⚠️  Copilot Bridge not detected on port 9001"
    echo "   Extension may need a few more seconds to start..."
    sleep 5
    if lsof -i :9001 > /dev/null 2>&1; then
        echo "✅ Copilot Bridge is now running"
    else
        echo "❌ Copilot Bridge failed to start"
        echo "   Please check VS Code Output panel: View → Output → Copilot Web Bridge"
    fi
fi

echo ""
echo "VS Code is now running in the background (headless mode)"
echo "You can close the VS Code window if it appeared - the extension will keep running"
echo ""
echo "To check status: lsof -i :9001"
echo "To stop: pkill -f 'Visual Studio Code'"
