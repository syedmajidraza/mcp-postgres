#!/bin/bash
# MCP Registry CLI - Install MCP servers from internal registry to VS Code

set -e

REGISTRY_URL="${MCP_REGISTRY_URL:-http://localhost:8000}"
INSTALL_DIR="${MCP_INSTALL_DIR:-$HOME/.mcp-servers}"
VSCODE_SETTINGS="$HOME/Library/Application Support/Code/User/settings.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_usage() {
    cat << EOF
MCP Registry CLI - Install MCP servers from internal registry

Usage:
  mcp-install <command> [options]

Commands:
  install <name>@<version>   Install an MCP server from registry
  list                       List all available servers
  search <query>             Search for servers
  info <name>@<version>      Show server details
  uninstall <name>           Remove installed MCP server
  config <name>              Show VS Code configuration for a server

Examples:
  mcp-install install postgres-mcp@1.0.0
  mcp-install list
  mcp-install search database
  mcp-install info postgres-mcp@1.0.0

Environment Variables:
  MCP_REGISTRY_URL    Registry URL (default: http://localhost:8000)
  MCP_INSTALL_DIR     Install directory (default: ~/.mcp-servers)

EOF
}

function check_dependencies() {
    local missing=()

    command -v curl >/dev/null 2>&1 || missing+=("curl")
    command -v tar >/dev/null 2>&1 || missing+=("tar")
    command -v jq >/dev/null 2>&1 || missing+=("jq")

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${RED}Error: Missing required dependencies: ${missing[*]}${NC}"
        echo "Please install them first:"
        echo "  macOS: brew install ${missing[*]}"
        echo "  Linux: sudo apt-get install ${missing[*]}"
        exit 1
    fi
}

function list_servers() {
    echo -e "${GREEN}Fetching servers from registry...${NC}"

    response=$(curl -s "$REGISTRY_URL/api/v1/servers")

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Could not connect to registry at $REGISTRY_URL${NC}"
        exit 1
    fi

    echo "$response" | jq -r '.servers[] | "\(.name)@\(.version) - \(.description) (downloads: \(.downloads))"'
}

function search_servers() {
    local query="$1"

    if [ -z "$query" ]; then
        echo -e "${RED}Error: Search query is required${NC}"
        exit 1
    fi

    echo -e "${GREEN}Searching for '$query'...${NC}"

    response=$(curl -s "$REGISTRY_URL/api/v1/servers/search?q=$query")

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Could not connect to registry${NC}"
        exit 1
    fi

    echo "$response" | jq -r '.results[] | "\(.name)@\(.version) - \(.description)"'
}

function get_server_info() {
    local name_version="$1"
    local name="${name_version%@*}"
    local version="${name_version#*@}"

    if [ -z "$name" ] || [ -z "$version" ]; then
        echo -e "${RED}Error: Format should be <name>@<version>${NC}"
        exit 1
    fi

    echo -e "${GREEN}Fetching info for $name@$version...${NC}"

    response=$(curl -s "$REGISTRY_URL/api/v1/servers/$name/$version")

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Server not found${NC}"
        exit 1
    fi

    echo "$response" | jq '.'
}

function install_server() {
    local name_version="$1"
    local name="${name_version%@*}"
    local version="${name_version#*@}"

    if [ -z "$name" ] || [ -z "$version" ]; then
        echo -e "${RED}Error: Format should be <name>@<version>${NC}"
        echo "Example: mcp-install install postgres-mcp@1.0.0"
        exit 1
    fi

    echo -e "${GREEN}Installing $name@$version from registry...${NC}"

    # Create install directory
    mkdir -p "$INSTALL_DIR"

    # Download package
    echo "Downloading package..."
    local package_path="$INSTALL_DIR/${name}-${version}.tar.gz"
    curl -f -o "$package_path" "$REGISTRY_URL/api/v1/servers/$name/$version/download"

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to download package${NC}"
        exit 1
    fi

    # Extract package
    echo "Extracting package..."
    local extract_dir="$INSTALL_DIR/$name"
    mkdir -p "$extract_dir"
    tar -xzf "$package_path" -C "$extract_dir"

    # Clean up tarball
    rm "$package_path"

    # Detect server type and install dependencies
    cd "$extract_dir"

    if [ -f "requirements.txt" ]; then
        echo -e "${YELLOW}Python MCP server detected${NC}"
        echo "Installing Python dependencies..."

        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi

        source venv/bin/activate
        pip install -q -r requirements.txt
        deactivate

        echo -e "${GREEN}✓ Python dependencies installed${NC}"

    elif [ -f "package.json" ]; then
        echo -e "${YELLOW}Node.js MCP server detected${NC}"
        echo "Installing Node.js dependencies..."

        npm install --silent

        echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
    fi

    echo -e "${GREEN}✓ Successfully installed $name@$version to $extract_dir${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Add configuration to VS Code settings:"
    echo ""
    show_vscode_config "$name"
    echo ""
    echo "2. Reload VS Code window (Cmd+Shift+P → 'Developer: Reload Window')"
}

function show_vscode_config() {
    local name="$1"
    local extract_dir="$INSTALL_DIR/$name"

    if [ ! -d "$extract_dir" ]; then
        echo -e "${RED}Error: Server $name is not installed${NC}"
        exit 1
    fi

    # Detect server type
    if [ -f "$extract_dir/requirements.txt" ]; then
        # Python server
        local server_file=$(find "$extract_dir" -name "server.py" -o -name "main.py" | head -n 1)

        if [ -z "$server_file" ]; then
            server_file="$extract_dir/server.py"
        fi

        cat << EOF
{
  "claude.mcpServers": {
    "$name": {
      "command": "python",
      "args": [
        "$server_file"
      ],
      "env": {
        // Add your environment variables here
      }
    }
  }
}
EOF
    elif [ -f "$extract_dir/package.json" ]; then
        # Node.js server
        cat << EOF
{
  "claude.mcpServers": {
    "$name": {
      "command": "node",
      "args": [
        "$extract_dir/index.js"
      ],
      "env": {
        // Add your environment variables here
      }
    }
  }
}
EOF
    else
        cat << EOF
{
  "claude.mcpServers": {
    "$name": {
      "command": "<path-to-executable>",
      "args": [],
      "env": {}
    }
  }
}
EOF
    fi
}

function uninstall_server() {
    local name="$1"
    local extract_dir="$INSTALL_DIR/$name"

    if [ ! -d "$extract_dir" ]; then
        echo -e "${RED}Error: Server $name is not installed${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Uninstalling $name...${NC}"
    rm -rf "$extract_dir"
    echo -e "${GREEN}✓ Successfully uninstalled $name${NC}"
    echo ""
    echo "Don't forget to remove the configuration from VS Code settings.json"
}

# Main
case "${1:-help}" in
    install)
        check_dependencies
        install_server "$2"
        ;;
    list)
        check_dependencies
        list_servers
        ;;
    search)
        check_dependencies
        search_servers "$2"
        ;;
    info)
        check_dependencies
        get_server_info "$2"
        ;;
    uninstall)
        uninstall_server "$2"
        ;;
    config)
        show_vscode_config "$2"
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac
