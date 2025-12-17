#!/bin/bash

# PostgreSQL MCP Installation Script
# This script sets up both the MCP server and VS Code extension

set -e  # Exit on error

echo "=========================================="
echo "PostgreSQL MCP Installation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
echo "Checking prerequisites..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    echo "Please install Python 3.8 or higher from https://www.python.org/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✓ Python ${PYTHON_VERSION} found${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Warning: Node.js is not installed${NC}"
    echo "Node.js is required to build the VS Code extension"
    echo "Install from https://nodejs.org/ or continue with MCP server only"
    read -p "Continue with MCP server only? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    NODE_INSTALLED=false
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"
    NODE_INSTALLED=true
fi

# Check if PostgreSQL is accessible
echo ""
echo "Checking PostgreSQL connection..."
read -p "PostgreSQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "PostgreSQL port (default: 5431): " DB_PORT
DB_PORT=${DB_PORT:-5431}

read -p "Database name (default: AdventureWorks): " DB_NAME
DB_NAME=${DB_NAME:-AdventureWorks}

read -p "Database user (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Database password: " DB_PASSWORD
echo ""

# Test PostgreSQL connection
if command -v psql &> /dev/null; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" &> /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PostgreSQL connection successful${NC}"
    else
        echo -e "${YELLOW}Warning: Could not connect to PostgreSQL${NC}"
        echo "You can configure this later in the .env file"
    fi
else
    echo -e "${YELLOW}Warning: psql not found, skipping connection test${NC}"
fi

# Install MCP Server
echo ""
echo "=========================================="
echo "Installing MCP Server"
echo "=========================================="

cd mcp-server

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
echo "Creating .env configuration..."
cat > .env << EOF
# PostgreSQL Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Server Configuration
SERVER_HOST=127.0.0.1
SERVER_PORT=3000
EOF

echo -e "${GREEN}✓ MCP Server installed successfully${NC}"

# Test the server
echo ""
echo "Testing MCP Server..."
python server.py &
SERVER_PID=$!
sleep 3

# Check if server is running
if curl -s http://127.0.0.1:3000/health &> /dev/null; then
    echo -e "${GREEN}✓ MCP Server is running correctly${NC}"
    kill $SERVER_PID
else
    echo -e "${RED}✗ MCP Server failed to start${NC}"
    kill $SERVER_PID 2>/dev/null || true
fi

cd ..

# Install VS Code Extension
if [ "$NODE_INSTALLED" = true ]; then
    echo ""
    echo "=========================================="
    echo "Building VS Code Extension"
    echo "=========================================="

    cd vscode-extension

    # Install npm dependencies
    echo "Installing npm dependencies..."
    npm install

    # Compile TypeScript
    echo "Compiling TypeScript..."
    npm run compile

    # Package extension
    echo "Packaging extension..."
    npm run package

    if [ -f *.vsix ]; then
        VSIX_FILE=$(ls *.vsix | head -n 1)
        echo -e "${GREEN}✓ Extension packaged: $VSIX_FILE${NC}"
        echo ""
        echo "To install the extension in VS Code:"
        echo "1. Open VS Code"
        echo "2. Press Cmd+Shift+P (macOS) or Ctrl+Shift+P (Windows/Linux)"
        echo "3. Type 'Extensions: Install from VSIX'"
        echo "4. Select: $(pwd)/$VSIX_FILE"
    else
        echo -e "${YELLOW}Warning: VSIX file not found${NC}"
    fi

    cd ..
fi

# Installation complete
echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. MCP Server:"
echo "   cd mcp-server"
echo "   source venv/bin/activate"
echo "   python server.py"
echo ""

if [ "$NODE_INSTALLED" = true ]; then
    echo "2. VS Code Extension:"
    echo "   - Install the .vsix file from vscode-extension/"
    echo "   - Configure database connection in VS Code settings"
    echo "   - Use @postgres in GitHub Copilot chat"
    echo ""
fi

echo "For detailed instructions, see README.md"
echo ""
echo -e "${GREEN}Happy coding!${NC}"
