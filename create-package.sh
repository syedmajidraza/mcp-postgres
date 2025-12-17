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
cat > $PACKAGE_DIR/install.sh << 'INSTALLER_EOF'
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
    echo ""
    echo "⚠️  IMPORTANT: Configure your database connection"
    echo "Edit file: ~/.postgres-mcp/mcp-server/.env"
    echo ""
fi

deactivate

echo "✅ MCP server installed to: $INSTALL_DIR"
echo ""
echo "📦 Next steps:"
echo "1. Configure database: nano ~/.postgres-mcp/mcp-server/.env"
echo "2. Install VS Code extension (see instructions below)"
echo ""
echo "VS Code Extension Installation:"
echo "  1. Open VS Code"
echo "  2. Press Cmd+Shift+P (macOS) or Ctrl+Shift+P (Windows/Linux)"
echo "  3. Type: Extensions: Install from VSIX"
echo "  4. Select: postgres-mcp-copilot-1.0.0.vsix from this folder"
echo "  5. Reload VS Code window"
echo ""
echo "📚 Documentation available in: docs/"
INSTALLER_EOF

chmod +x $PACKAGE_DIR/install.sh

# 5. Create Windows installation script
cat > $PACKAGE_DIR/install.ps1 << 'PS_EOF'
# PostgreSQL MCP Installation Script for Windows

Write-Host "🚀 Installing PostgreSQL MCP..." -ForegroundColor Green

# Get installation directory
$INSTALL_DIR = "$env:USERPROFILE\.postgres-mcp"
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null

# Copy MCP server
Write-Host "Installing MCP server..." -ForegroundColor Yellow
Copy-Item -Path "mcp-server" -Destination $INSTALL_DIR -Recurse -Force

Set-Location "$INSTALL_DIR\mcp-server"

# Create virtual environment
Write-Host "Setting up Python environment..." -ForegroundColor Yellow
python -m venv venv

# Activate and install
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
& "venv\Scripts\pip.exe" install --upgrade pip
& "venv\Scripts\pip.exe" install -r requirements.txt

# Create .env file
if (-not (Test-Path .env)) {
    Write-Host "Creating .env configuration file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Configure your database connection" -ForegroundColor Red
    Write-Host "Edit file: $INSTALL_DIR\mcp-server\.env" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "✅ MCP server installed to: $INSTALL_DIR" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure database: notepad $INSTALL_DIR\mcp-server\.env"
Write-Host "2. Install VS Code extension (see instructions below)"
Write-Host ""
Write-Host "VS Code Extension Installation:" -ForegroundColor Cyan
Write-Host "  1. Open VS Code"
Write-Host "  2. Press Ctrl+Shift+P"
Write-Host "  3. Type: Extensions: Install from VSIX"
Write-Host "  4. Select: postgres-mcp-copilot-1.0.0.vsix from this folder"
Write-Host "  5. Reload VS Code window"
Write-Host ""
Write-Host "📚 Documentation available in: docs\" -ForegroundColor Cyan
PS_EOF

# 6. Create README
cat > $PACKAGE_DIR/README.md << 'README_EOF'
# PostgreSQL MCP - Installation Package

## Quick Install

### macOS/Linux
```bash
./install.sh
```

### Windows
```powershell
.\install.ps1
```

## Post-Installation Setup

### 1. Configure Database Connection

**macOS/Linux:**
```bash
nano ~/.postgres-mcp/mcp-server/.env
```

**Windows:**
```powershell
notepad %USERPROFILE%\.postgres-mcp\mcp-server\.env
```

**Update with your database credentials:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password

SERVER_HOST=127.0.0.1
SERVER_PORT=3000
```

### 2. Install VS Code Extension

1. Open VS Code
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Type: `Extensions: Install from VSIX`
4. Select: `postgres-mcp-copilot-1.0.0.vsix`
5. Click Install
6. Reload VS Code window

### 3. Start MCP Server

The extension can start the server automatically, or you can start it manually:

**macOS/Linux:**
```bash
cd ~/.postgres-mcp/mcp-server
source venv/bin/activate
python server.py
```

**Windows:**
```powershell
cd %USERPROFILE%\.postgres-mcp\mcp-server
venv\Scripts\activate
python server.py
```

### 4. Use in VS Code

1. Open Copilot Chat
2. Type: `@postgres show tables`
3. Enjoy natural language SQL!

## VS Code Extension Commands

Access via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- `PostgreSQL MCP: Start Server` - Start the MCP server
- `PostgreSQL MCP: Stop Server` - Stop the MCP server
- `PostgreSQL MCP: Restart Server` - Restart the MCP server
- `PostgreSQL MCP: Show Server Status` - Check server status
- `PostgreSQL MCP: Configure Database Connection` - Update database settings

## Status Bar

The extension shows status in VS Code status bar (bottom):

- 🟢 **PostgreSQL MCP: Running** - Server is running and ready
- 🟡 **PostgreSQL MCP: Stopped** - Server is not running
- 🔴 **PostgreSQL MCP: Error** - Server encountered an error

Click the status to see details.

## Example Queries

```
@postgres show tables
@postgres describe employees table
@postgres how many employees earn more than 70000?
@postgres show me top 5 highest paid employees
@postgres create a table for product reviews
@postgres what's the average salary by department?
```

## Requirements

- Python 3.8 or higher
- Node.js 18+ (for extension development only)
- PostgreSQL database
- VS Code with GitHub Copilot extension
- Active GitHub Copilot subscription

## Documentation

See `docs/` folder for detailed guides:

- `DEVELOPER_QUICK_START.md` - Quick start guide (30 seconds)
- `USAGE_EXAMPLES.md` - Complete query examples
- `LLM_ENHANCED_GUIDE.md` - Technical details
- `TESTING_GUIDE.md` - Testing instructions
- `IMPLEMENTATION_SUMMARY.md` - Implementation overview

## Troubleshooting

### Server won't start

Check Python version:
```bash
python3 --version
```

Verify dependencies:
```bash
cd ~/.postgres-mcp/mcp-server
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip list
```

### Can't connect to database

Test connection manually:
```bash
psql -h localhost -p 5432 -U your_user -d your_database
```

Check `.env` file has correct credentials.

### Extension not working

1. Ensure GitHub Copilot is active (check status bar icon)
2. Check MCP server is running: `curl http://127.0.0.1:3000/health`
3. View extension logs: View → Output → PostgreSQL MCP
4. Restart VS Code

## Support

Contact your DevOps/Database team for assistance.

## Version

PostgreSQL MCP v1.0.0
LLM-Enhanced with GitHub Copilot
README_EOF

# 7. Create version file
cat > $PACKAGE_DIR/VERSION << VERSION_EOF
PostgreSQL MCP Package
Version: 1.0.0
Build Date: $(date)
LLM-Enhanced: Yes (requires GitHub Copilot)
Components:
  - MCP Server (FastAPI)
  - VS Code Extension
  - LLM Integration (GitHub Copilot)
VERSION_EOF

# 8. Create tarball
echo "Creating distribution archive..."
tar -czf postgres-mcp-v1.0.0.tar.gz $PACKAGE_DIR

echo ""
echo "✅ Package created successfully!"
echo ""
echo "📂 Package contents:"
echo "  - MCP Server"
echo "  - VS Code Extension (.vsix)"
echo "  - Documentation"
echo "  - Installation scripts (macOS/Linux/Windows)"
echo ""
echo "📦 Distribution file: postgres-mcp-v1.0.0.tar.gz"
ls -lh postgres-mcp-v1.0.0.tar.gz
echo ""
echo "📤 Distribution options:"
echo ""
echo "Option 1: Local File Share"
echo "  - Upload postgres-mcp-v1.0.0.tar.gz to shared network drive"
echo "  - Share path with developers"
echo ""
echo "Option 2: Internal Web Server"
echo "  - Upload to internal web server"
echo "  - Share download URL: http://internal-server/postgres-mcp-v1.0.0.tar.gz"
echo ""
echo "Option 3: Git Repository"
echo "  - Create internal GitLab/GitHub repo"
echo "  - Push package contents"
echo "  - Developers clone and install"
echo ""
echo "📧 Share with developers:"
echo "  1. Extract: tar -xzf postgres-mcp-v1.0.0.tar.gz"
echo "  2. Run: cd postgres-mcp-package && ./install.sh"
echo "  3. Configure database in ~/.postgres-mcp/mcp-server/.env"
echo "  4. Install VS Code extension"
echo ""
