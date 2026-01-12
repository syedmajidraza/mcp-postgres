#!/bin/bash
# Check if GitHub Copilot is properly set up for headless mode

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  GitHub Copilot Setup Checker                          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

COPILOT_DIR="$HOME/Library/Application Support/Code/User/globalStorage/github.copilot"

# Check 1: Copilot directory exists
echo "📁 Checking Copilot credentials directory..."
if [ -d "$COPILOT_DIR" ]; then
    echo "   ✅ Directory exists: $COPILOT_DIR"
    echo ""

    # Check 2: Credential files exist
    echo "🔑 Checking for credential files..."
    FILE_COUNT=$(ls -1 "$COPILOT_DIR" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$FILE_COUNT" -gt 0 ]; then
        echo "   ✅ Found $FILE_COUNT credential file(s):"
        ls -lh "$COPILOT_DIR" | tail -n +2 | awk '{print "      - " $9 " (" $5 ")"}'
        echo ""

        # Check 3: Recent files
        echo "📅 Checking credential file age..."
        LATEST_FILE=$(ls -t "$COPILOT_DIR" 2>/dev/null | head -1)
        if [ -n "$LATEST_FILE" ]; then
            FILE_AGE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$COPILOT_DIR/$LATEST_FILE" 2>/dev/null)
            echo "   ✅ Latest credential: $LATEST_FILE"
            echo "      Modified: $FILE_AGE"
        fi
        echo ""

        # Final verdict
        echo "╔════════════════════════════════════════════════════════╗"
        echo "║  ✅ READY FOR HEADLESS MODE                            ║"
        echo "╚════════════════════════════════════════════════════════╝"
        echo ""
        echo "You can now run:"
        echo "   ./start-truly-headless.sh"
        echo ""

    else
        echo "   ❌ No credential files found in directory"
        echo ""
        echo "╔════════════════════════════════════════════════════════╗"
        echo "║  ⚠️  COPILOT NOT AUTHENTICATED                         ║"
        echo "╚════════════════════════════════════════════════════════╝"
        echo ""
        echo "Directory exists but is empty. You need to:"
        echo "1. Open VS Code: open -a 'Visual Studio Code'"
        echo "2. Sign in to Copilot: Cmd+Shift+P → 'Copilot: Sign In'"
        echo "3. Run this check script again"
        echo ""
    fi

else
    echo "   ❌ Directory not found: $COPILOT_DIR"
    echo ""

    # Check if VS Code is installed
    echo "🔍 Checking VS Code installation..."
    if [ -d "/Applications/Visual Studio Code.app" ]; then
        echo "   ✅ VS Code is installed"
    else
        echo "   ❌ VS Code not found at /Applications/Visual Studio Code.app"
        echo "      You may need to install VS Code first"
    fi
    echo ""

    # Check if Copilot extension is installed
    echo "🔍 Checking for Copilot extension..."
    COPILOT_EXT="$HOME/.vscode/extensions"
    if [ -d "$COPILOT_EXT" ]; then
        COPILOT_COUNT=$(ls -1d "$COPILOT_EXT"/github.copilot-* 2>/dev/null | wc -l | tr -d ' ')
        if [ "$COPILOT_COUNT" -gt 0 ]; then
            echo "   ✅ GitHub Copilot extension is installed"
            ls -1d "$COPILOT_EXT"/github.copilot-* 2>/dev/null | sed 's|.*/||' | sed 's/^/      - /'
        else
            echo "   ❌ GitHub Copilot extension not found"
        fi
    else
        echo "   ❌ VS Code extensions directory not found"
    fi
    echo ""

    echo "╔════════════════════════════════════════════════════════╗"
    echo "║  ❌ NOT READY FOR HEADLESS MODE                        ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "Required actions:"
    echo ""
    echo "1️⃣  Open VS Code:"
    echo "    open -a 'Visual Studio Code'"
    echo ""
    echo "2️⃣  Install GitHub Copilot extension:"
    echo "    • Press: Cmd+Shift+X"
    echo "    • Search: 'GitHub Copilot'"
    echo "    • Click: Install"
    echo ""
    echo "3️⃣  Sign in to GitHub Copilot:"
    echo "    • Press: Cmd+Shift+P"
    echo "    • Type: 'Copilot: Sign In'"
    echo "    • Follow the authentication flow"
    echo ""
    echo "4️⃣  Verify in VS Code status bar:"
    echo "    • Should show: 'Copilot: Ready' (bottom right)"
    echo ""
    echo "5️⃣  Close VS Code and run this script again:"
    echo "    ./check-copilot-setup.sh"
    echo ""
fi

echo "════════════════════════════════════════════════════════════"
echo ""

# Show next steps
if [ -d "$COPILOT_DIR" ] && [ "$(ls -1 "$COPILOT_DIR" 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
    echo "💡 Next steps:"
    echo ""
    echo "   Start in headless mode (no VS Code window):"
    echo "   ./start-truly-headless.sh"
    echo ""
    echo "   OR start with VS Code minimized:"
    echo "   ./start-all.sh"
    echo ""
else
    echo "💡 Current option (until Copilot is authenticated):"
    echo ""
    echo "   Use standard mode with VS Code minimized:"
    echo "   ./start-all.sh"
    echo ""
    echo "   (Keep VS Code minimized, don't close it)"
    echo ""
fi
