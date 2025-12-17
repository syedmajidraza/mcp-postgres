# PostgreSQL MCP Installation Script for Windows
# Run with: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL MCP Installation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python installation
Write-Host "Checking prerequisites..."
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ $pythonVersion found" -ForegroundColor Green
} catch {
    Write-Host "Error: Python 3 is not installed" -ForegroundColor Red
    Write-Host "Please install Python 3.8 or higher from https://www.python.org/"
    exit 1
}

# Check Node.js installation
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
    $nodeInstalled = $true
} catch {
    Write-Host "Warning: Node.js is not installed" -ForegroundColor Yellow
    Write-Host "Node.js is required to build the VS Code extension"
    Write-Host "Install from https://nodejs.org/ or continue with MCP server only"
    $response = Read-Host "Continue with MCP server only? (y/n)"
    if ($response -ne "y") {
        exit 1
    }
    $nodeInstalled = $false
}

# Get database configuration
Write-Host ""
Write-Host "Configuring PostgreSQL connection..."

$dbHost = Read-Host "PostgreSQL host (default: localhost)"
if ([string]::IsNullOrEmpty($dbHost)) { $dbHost = "localhost" }

$dbPort = Read-Host "PostgreSQL port (default: 5431)"
if ([string]::IsNullOrEmpty($dbPort)) { $dbPort = "5431" }

$dbName = Read-Host "Database name (default: AdventureWorks)"
if ([string]::IsNullOrEmpty($dbName)) { $dbName = "AdventureWorks" }

$dbUser = Read-Host "Database user (default: postgres)"
if ([string]::IsNullOrEmpty($dbUser)) { $dbUser = "postgres" }

$dbPassword = Read-Host "Database password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

# Install MCP Server
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Installing MCP Server" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Set-Location mcp-server

# Create virtual environment
Write-Host "Creating Python virtual environment..."
python -m venv venv

# Activate virtual environment
Write-Host "Activating virtual environment..."
& .\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing Python dependencies..."
python -m pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
Write-Host "Creating .env configuration..."
$envContent = @"
# PostgreSQL Database Configuration
DB_HOST=$dbHost
DB_PORT=$dbPort
DB_NAME=$dbName
DB_USER=$dbUser
DB_PASSWORD=$dbPasswordPlain

# Server Configuration
SERVER_HOST=127.0.0.1
SERVER_PORT=3000
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "✓ MCP Server installed successfully" -ForegroundColor Green

# Test the server
Write-Host ""
Write-Host "Testing MCP Server..."
$serverProcess = Start-Process python -ArgumentList "server.py" -PassThru -NoNewWindow
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ MCP Server is running correctly" -ForegroundColor Green
} catch {
    Write-Host "✗ MCP Server failed to start" -ForegroundColor Red
} finally {
    if ($serverProcess -and !$serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force
    }
}

Set-Location ..

# Install VS Code Extension
if ($nodeInstalled) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Building VS Code Extension" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan

    Set-Location vscode-extension

    # Install npm dependencies
    Write-Host "Installing npm dependencies..."
    npm install

    # Compile TypeScript
    Write-Host "Compiling TypeScript..."
    npm run compile

    # Package extension
    Write-Host "Packaging extension..."
    npm run package

    $vsixFile = Get-ChildItem -Filter "*.vsix" | Select-Object -First 1
    if ($vsixFile) {
        Write-Host "✓ Extension packaged: $($vsixFile.Name)" -ForegroundColor Green
        Write-Host ""
        Write-Host "To install the extension in VS Code:"
        Write-Host "1. Open VS Code"
        Write-Host "2. Press Ctrl+Shift+P"
        Write-Host "3. Type 'Extensions: Install from VSIX'"
        Write-Host "4. Select: $((Get-Location).Path)\$($vsixFile.Name)"
    } else {
        Write-Host "Warning: VSIX file not found" -ForegroundColor Yellow
    }

    Set-Location ..
}

# Installation complete
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host ""
Write-Host "1. MCP Server:"
Write-Host "   cd mcp-server"
Write-Host "   .\venv\Scripts\Activate.ps1"
Write-Host "   python server.py"
Write-Host ""

if ($nodeInstalled) {
    Write-Host "2. VS Code Extension:"
    Write-Host "   - Install the .vsix file from vscode-extension\"
    Write-Host "   - Configure database connection in VS Code settings"
    Write-Host "   - Use @postgres in GitHub Copilot chat"
    Write-Host ""
}

Write-Host "For detailed instructions, see README.md"
Write-Host ""
Write-Host "Happy coding!" -ForegroundColor Green
