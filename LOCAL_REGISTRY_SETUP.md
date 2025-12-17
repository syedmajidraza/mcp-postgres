#!/bin/bash
# Package PostgreSQL MCP for local registry distribution

set -e

echo "📦 Packaging PostgreSQL MCP for local registry..."

# Create package directory
PACKAGE_DIR="postgres-mcp-package"
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# 1. Copy MCP Server
echo "Copying MCP server..."
cp -r mcp-server $PACKAGE_DIR/
rm -rf $PACKAGE_DIR/mcp-server/venv
rm -rf $PACKAGE_DIR/mcp-server/__pycache__
rm -f $PACKAGE_DIR/mcp-server/.env

# 2. Copy VS Code Extension
echo "Copying VS Code extension..."
cp vscode-extension/postgres-mcp-copilot-1.0.0.vsix $PACKAGE_DIR/

# 3. Copy Documentation
echo "Copying documentation..."
mkdir -p $PACKAGE_DIR/docs
cp IMPLEMENTATION_SUMMARY.md $PACKAGE_DIR/docs/
cp DEVELOPER_QUICK_START.md $PACKAGE_DIR/docs/
cp LLM_ENHANCED_GUIDE.md $PACKAGE_DIR/docs/
cp TESTING_GUIDE.md $PACKAGE_DIR/docs/
cp USAGE_EXAMPLES.md $PACKAGE_DIR/docs/

# 4. Create installation script
cat > $PACKAGE_DIR/install.sh << 'EOF'
#!/bin/bash
# PostgreSQL MCP Installation Script

set -e

echo "🚀 Installing PostgreSQL MCP..."

# Get installation directory
INSTALL_DIR="${HOME}/.postgres-mcp"
mkdir -p $INSTALL_DIR

# Copy MCP server
echo "Installing MCP server..."
cp -r mcp-server $INSTALL_DIR/
cd $INSTALL_DIR/mcp-server

# Create virtual environment
echo "Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
if [ ! -f .env ]; then
    echo "Creating .env configuration file..."
    cp .env.example .env
    echo "⚠️  Please edit ~/.postgres-mcp/mcp-server/.env with your database credentials"
fi

echo "✅ MCP server installed to: $INSTALL_DIR"
echo ""
echo "📦 Next steps:"
echo "1. Edit database config: nano ~/.postgres-mcp/mcp-server/.env"
echo "2. Install VS Code extension from: postgres-mcp-copilot-1.0.0.vsix"
echo "3. Reload VS Code"
echo "4. Start using @postgres in Copilot Chat"
EOF

chmod +x $PACKAGE_DIR/install.sh

# 5. Create README
cat > $PACKAGE_DIR/README.md << 'EOF'
# PostgreSQL MCP - Installation Package

## Quick Install

### 1. Run Installation Script
```bash
./install.sh
```

### 2. Configure Database
```bash
nano ~/.postgres-mcp/mcp-server/.env
```

Update with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
```

### 3. Install VS Code Extension
```
1. Open VS Code
2. Press Cmd+Shift+P (or Ctrl+Shift+P)
3. Type "Extensions: Install from VSIX"
4. Select: postgres-mcp-copilot-1.0.0.vsix
5. Reload VS Code
```

### 4. Start Using
```
1. Open Copilot Chat in VS Code
2. Type: @postgres show tables
3. Enjoy natural language SQL!
```

## Documentation

See `docs/` folder for:
- `DEVELOPER_QUICK_START.md` - Quick start guide
- `USAGE_EXAMPLES.md` - Example queries
- `LLM_ENHANCED_GUIDE.md` - Technical details

## Support

Contact your DevOps team for assistance.
EOF

# 6. Create version file
cat > $PACKAGE_DIR/VERSION << EOF
PostgreSQL MCP Package
Version: 1.0.0
Build Date: $(date)
LLM-Enhanced: Yes (requires GitHub Copilot)
EOF

# 7. Create tarball
echo "Creating distribution archive..."
tar -czf postgres-mcp-v1.0.0.tar.gz $PACKAGE_DIR

echo "✅ Package created: postgres-mcp-v1.0.0.tar.gz"
echo ""
echo "📂 Package contents:"
ls -lh postgres-mcp-v1.0.0.tar.gz
echo ""
echo "📤 Next steps:"
echo "1. Upload postgres-mcp-v1.0.0.tar.gz to your file share"
echo "2. Share download link with developers"
echo "3. Developers extract and run ./install.sh"
