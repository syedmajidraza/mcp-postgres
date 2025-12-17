# Project Structure

Complete file and directory structure of the PostgreSQL MCP project.

```
postgres-mcp/
│
├── 📄 README.md                    # Main project documentation
├── 📄 QUICK_START.md              # 5-minute getting started guide
├── 📄 PROJECT_SUMMARY.md          # High-level project overview
├── 📄 ARCHITECTURE.md             # Technical architecture details
├── 📄 EXAMPLES.md                 # Practical usage examples
├── 📄 CONTRIBUTING.md             # Contribution guidelines
├── 📄 LICENSE                     # MIT License
├── 📄 .gitignore                  # Git ignore rules
│
├── 🔧 install.sh                  # macOS/Linux installation script
├── 🔧 install.ps1                 # Windows installation script
│
├── 📁 mcp-server/                 # FastAPI MCP Server
│   ├── 📄 server.py               # Main server implementation
│   ├── 📄 config.py               # Configuration management
│   ├── 📄 requirements.txt        # Python dependencies
│   ├── 📄 .env.example            # Example environment variables
│   ├── 📄 README.md               # Server documentation
│   ├── 🔧 start.sh                # Unix startup script
│   ├── 🔧 start.bat               # Windows startup script
│   │
│   └── 🚫 (Generated at runtime)
│       ├── venv/                  # Python virtual environment
│       ├── .env                   # Your database credentials (not in git)
│       └── __pycache__/           # Python bytecode cache
│
└── 📁 vscode-extension/           # VS Code Extension
    ├── 📄 package.json            # Extension manifest
    ├── 📄 tsconfig.json           # TypeScript configuration
    ├── 📄 .vscodeignore           # Files to exclude from package
    ├── 📄 README.md               # Extension documentation
    │
    ├── 📁 src/                    # Source code
    │   └── 📄 extension.ts        # Main extension code
    │
    └── 🚫 (Generated at build)
        ├── out/                   # Compiled JavaScript
        ├── node_modules/          # NPM dependencies
        └── *.vsix                 # Packaged extension file
```

## File Descriptions

### Root Level Documentation

| File | Purpose |
|------|---------|
| `README.md` | Complete project documentation with setup instructions |
| `QUICK_START.md` | Fast-track installation and usage guide |
| `PROJECT_SUMMARY.md` | High-level overview of the entire project |
| `ARCHITECTURE.md` | Technical architecture and design decisions |
| `EXAMPLES.md` | Real-world usage examples and patterns |
| `CONTRIBUTING.md` | Guidelines for contributing to the project |
| `LICENSE` | MIT License terms |
| `.gitignore` | Files and directories to exclude from Git |

### Installation Scripts

| File | Purpose |
|------|---------|
| `install.sh` | Automated installation for macOS/Linux |
| `install.ps1` | Automated installation for Windows PowerShell |

### MCP Server Files

| File | Purpose |
|------|---------|
| `server.py` | FastAPI application with MCP endpoints and tools |
| `config.py` | Configuration loader using environment variables |
| `requirements.txt` | Python package dependencies |
| `.env.example` | Template for environment variables |
| `README.md` | Server-specific documentation and API reference |
| `start.sh` | Unix/Linux startup script |
| `start.bat` | Windows startup script |

### VS Code Extension Files

| File | Purpose |
|------|---------|
| `package.json` | Extension metadata, dependencies, and commands |
| `tsconfig.json` | TypeScript compiler configuration |
| `.vscodeignore` | Files to exclude when packaging |
| `README.md` | Extension usage guide |
| `src/extension.ts` | Main extension code with chat participant |

## Generated Files and Directories

These are created during installation/build and should not be committed to Git:

### MCP Server
- `venv/` - Python virtual environment with installed packages
- `.env` - Your actual database credentials and settings
- `__pycache__/` - Python compiled bytecode

### VS Code Extension
- `out/` - Compiled JavaScript from TypeScript
- `node_modules/` - NPM package dependencies
- `*.vsix` - Packaged extension ready for installation

## Important Files to Configure

### For MCP Server

**`.env`** (create from `.env.example`):
```env
DB_HOST=localhost
DB_PORT=5431
DB_NAME=AdventureWorks
DB_USER=postgres
DB_PASSWORD=your_password
```

### For VS Code Extension

**VS Code Settings** (configure in VS Code):
```json
{
  "postgresMcp.database.host": "localhost",
  "postgresMcp.database.port": 5431,
  "postgresMcp.database.name": "AdventureWorks",
  "postgresMcp.database.user": "postgres"
}
```

## File Sizes (Approximate)

| Component | Files | Lines of Code |
|-----------|-------|---------------|
| MCP Server | 3 Python files | ~600 lines |
| VS Code Extension | 1 TypeScript file | ~500 lines |
| Documentation | 8 Markdown files | ~2,000 lines |
| Configuration | 5 config files | ~100 lines |
| **Total** | **17 source files** | **~3,200 lines** |

## Dependencies

### MCP Server (Python)
```
fastapi==0.115.0
uvicorn[standard]==0.32.0
asyncpg==0.29.0
pydantic==2.9.2
python-dotenv==1.0.1
```

### VS Code Extension (Node.js)
```json
{
  "dependencies": {
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/vscode": "^1.85.0",
    "typescript": "^5.3.2",
    "@vscode/vsce": "^2.22.0"
  }
}
```

## Build Outputs

### After Running `install.sh` or `install.ps1`:

1. **MCP Server**
   - Python virtual environment created
   - Dependencies installed
   - `.env` file configured
   - Ready to run with `python server.py`

2. **VS Code Extension**
   - NPM dependencies installed
   - TypeScript compiled to JavaScript
   - `.vsix` package file created
   - Ready to install in VS Code

## Development Workflow

### Working on MCP Server

```bash
cd mcp-server
source venv/bin/activate          # Activate environment
python server.py                  # Run server
# OR
uvicorn server:app --reload       # Run with hot reload
```

### Working on VS Code Extension

```bash
cd vscode-extension
npm install                       # Install dependencies
npm run compile                   # Compile TypeScript
npm run watch                     # Watch mode for development
# In VS Code: Press F5 to debug
```

## Distribution Files

When sharing the project, include:

✅ **Include:**
- All source files (`.py`, `.ts`)
- Documentation (`.md`)
- Configuration templates (`.env.example`)
- Installation scripts (`.sh`, `.ps1`)
- Package manifests (`requirements.txt`, `package.json`)

❌ **Exclude:**
- Virtual environments (`venv/`)
- Compiled code (`out/`, `__pycache__/`)
- Dependencies (`node_modules/`)
- Credentials (`.env`)
- Generated packages (`*.vsix`)
- IDE files (`.vscode/`, `.idea/`)

## Clean Installation Size

| Component | Size |
|-----------|------|
| Source code | ~200 KB |
| Documentation | ~100 KB |
| MCP Server dependencies | ~50 MB |
| Extension dependencies | ~30 MB |
| **Total installed** | **~80 MB** |

## Quick Reference

### Essential Commands

**Start MCP Server:**
```bash
cd mcp-server
./start.sh  # or start.bat on Windows
```

**Build Extension:**
```bash
cd vscode-extension
npm run package
```

**Install Extension:**
1. Open VS Code
2. Cmd/Ctrl + Shift + P
3. "Extensions: Install from VSIX"
4. Select the `.vsix` file

### Important Paths

| Item | Path |
|------|------|
| Server code | `mcp-server/server.py` |
| Extension code | `vscode-extension/src/extension.ts` |
| Server config | `mcp-server/.env` |
| Extension config | VS Code Settings |
| Logs | VS Code Output Panel |

## Next Steps

1. **First Time Setup**: Run `./install.sh` or `install.ps1`
2. **Configuration**: Edit `.env` with your database details
3. **Installation**: Install the `.vsix` file in VS Code
4. **Testing**: Try `@postgres List all tables`
5. **Learning**: Review `EXAMPLES.md` for more use cases

For detailed information, see:
- [README.md](README.md) - Complete documentation
- [QUICK_START.md](QUICK_START.md) - Fast setup guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
