# Adding PostgreSQL MCP to Local Registry (localhost:8080)

## Overview

This guide shows how to add your PostgreSQL MCP server to your local MCP registry running at `http://localhost:8080`.

**✅ Successfully Added!** The PostgreSQL MCP server now appears in your local registry UI.

---

## 📋 Working Registry Entry

This is the **tested and working** entry that displays correctly in your local MCP registry at `localhost:8080`:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
  "name": "io.github.syedmajidraza/mcp-postgres",
  "description": "PostgreSQL MCP Server with Natural Language Queries - Convert plain English to SQL using GitHub Copilot LLM. Features 8 database tools, VS Code extension with server management, and schema-aware SQL generation for complex queries, table creation, and stored procedures.",
  "repository": {
    "url": "https://github.com/syedmajidraza/mcp-postgres",
    "source": "github"
  },
  "version": "1.0.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@syedmajidraza/mcp-postgres",
      "version": "1.0.0",
      "transport": {
        "type": "stdio"
      }
    }
  ],
  "tools": [
    {
      "name": "list_tables",
      "description": "List all tables in a PostgreSQL schema"
    },
    {
      "name": "describe_table",
      "description": "Get detailed schema information for a specific table"
    },
    {
      "name": "query_database",
      "description": "Execute SELECT queries on the PostgreSQL database"
    },
    {
      "name": "execute_sql",
      "description": "Execute INSERT, UPDATE, DELETE, CREATE statements"
    },
    {
      "name": "create_table",
      "description": "Create new tables with proper schema"
    },
    {
      "name": "create_stored_procedure",
      "description": "Create stored procedures and functions in PL/pgSQL"
    },
    {
      "name": "get_table_indexes",
      "description": "Get all indexes for a specific table"
    },
    {
      "name": "analyze_query_plan",
      "description": "Analyze query execution plans (EXPLAIN)"
    }
  ],
  "capabilities": {
    "naturalLanguage": true,
    "llmIntegration": "GitHub Copilot",
    "schemaAware": true,
    "vscodeExtension": true
  },
  "requirements": {
    "postgresql": ">=10.0",
    "vscode": ">=1.80.0",
    "githubCopilot": true
  },
  "endpoints": {
    "health": "http://127.0.0.1:3000/health",
    "mcp": "http://127.0.0.1:3000/mcp/v1"
  }
}
```

---

## 🔑 Key Configuration

**Important Fields for Local Registry Compatibility:**

| Field | Value | Why It Matters |
|-------|-------|----------------|
| `registryType` | `"npm"` | ✅ Required for local registry UI display |
| `identifier` | `"@syedmajidraza/mcp-postgres"` | npm-style scoped package name |
| `transport.type` | `"stdio"` | ✅ Standard MCP transport (stdin/stdout) |

**Previous attempt used:**
- ❌ `"registryType": "git"` - Not displayed in UI
- ❌ `"transport.type": "http"` - Incompatible with registry

**Working configuration:**
- ✅ `"registryType": "npm"` - Displays in UI
- ✅ `"transport.type": "stdio"` - Standard MCP protocol

---

## 🚀 How It Was Added

### **Step 1: Located Registry's seed.json**

```bash
cd ~/mcp-registry  # or your registry location
find . -name "seed.json"
```

### **Step 2: Backed Up Original**

```bash
cp seed.json seed.json.backup
```

### **Step 3: Added Entry to Array**

Opened `seed.json` and added the PostgreSQL MCP entry (shown above) to the JSON array after existing entries.

### **Step 4: Validated JSON**

```bash
python3 -m json.tool seed.json > /dev/null && echo "✅ Valid"
# Output: ✅ Valid
```

### **Step 5: Restarted Registry**

```bash
npm start  # or docker restart, etc.
```

### **Step 6: Verified in UI**

Opened `http://localhost:8080` and confirmed:
- ✅ PostgreSQL MCP Server appears in list
- ✅ All 8 tools displayed
- ✅ Description and metadata visible
- ✅ GitHub repository link works

---

## 🌐 Registry UI Display

**What developers see at `http://localhost:8080`:**

**Package Name:** `@syedmajidraza/mcp-postgres`

**Display Name:** PostgreSQL MCP Server with Natural Language Queries

**Description:** Convert plain English to SQL using GitHub Copilot LLM. Features 8 database tools, VS Code extension with server management, and schema-aware SQL generation.

**Version:** 1.0.0

**Transport:** stdio

**Tools:** 8
- list_tables
- describe_table
- query_database
- execute_sql
- create_table
- create_stored_procedure
- get_table_indexes
- analyze_query_plan

**Capabilities:**
- Natural Language Queries
- LLM Integration (GitHub Copilot)
- Schema Aware
- VS Code Extension

---

## 👥 Developer Installation from Registry

### **Option 1: From Registry UI (Recommended)**

1. Open `http://localhost:8080`
2. Search for "PostgreSQL" or "@syedmajidraza"
3. Click on "PostgreSQL MCP Server"
4. Click "Install" or "Add to Project"
5. Follow installation instructions

### **Option 2: Manual Installation**

```bash
# 1. Clone repository
git clone https://github.com/syedmajidraza/mcp-postgres.git
cd mcp-postgres

# 2. Run installer
./install.sh

# 3. Configure database
nano ~/.postgres-mcp/mcp-server/.env
# Update: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# 4. Install VS Code extension
# Cmd+Shift+P → "Extensions: Install from VSIX"
# Select: postgres-mcp-copilot-1.0.0.vsix

# 5. Reload VS Code
# Cmd+Shift+P → "Developer: Reload Window"

# 6. Start using
# @postgres show tables
```

---

## 🔄 Updating the Registry Entry

### **When You Release a New Version:**

```bash
# 1. Update version in code
nano vscode-extension/package.json
# Change: "version": "1.0.0" → "1.1.0"

nano mcp-server/package.json
# Change: "version": "1.0.0" → "1.1.0"

# 2. Update registry-seed-entry.json
nano registry-seed-entry.json
# Change: "version": "1.0.0" → "1.1.0"

# 3. Rebuild and push to GitHub
cd vscode-extension
npm run compile
npm run package
cd ..
./create-package.sh
git add .
git commit -m "Release v1.1.0"
git tag v1.1.0
git push origin main --tags

# 4. Update registry seed.json
cd /path/to/mcp-registry
nano seed.json
# Find io.github.syedmajidraza/mcp-postgres entry
# Update: "version": "1.0.0" → "1.1.0"

# 5. Restart registry
npm start  # or your restart command

# 6. Verify update
# Open: http://localhost:8080
# Check version shows as 1.1.0
```

---

## 📊 Registry Entry Explained

| Field | Value | Description |
|-------|-------|-------------|
| `$schema` | Schema URL | MCP server schema version 2025-10-17 |
| `name` | `io.github.syedmajidraza/mcp-postgres` | Unique identifier (reverse domain) |
| `description` | Full description | Shown in registry UI search and detail page |
| `repository.url` | GitHub URL | Source code location |
| `repository.source` | `"github"` | Repository type |
| `version` | `1.0.0` | Current version (semantic versioning) |
| `packages[0].registryType` | `"npm"` | ✅ Package type (required for UI display) |
| `packages[0].identifier` | `"@syedmajidraza/mcp-postgres"` | npm-style scoped package name |
| `packages[0].transport.type` | `"stdio"` | ✅ MCP uses stdin/stdout |
| `tools` | Array of 8 tools | MCP tools with descriptions |
| `capabilities` | Custom metadata | Special features |
| `requirements` | Dependencies | What developers need |
| `endpoints` | API URLs | Health check and MCP endpoints |

---

## ✅ Verification Checklist

After adding to registry:

- [x] Entry appears at `http://localhost:8080`
- [x] Search for "PostgreSQL" finds the server
- [x] Server details page shows correctly
- [x] All 8 tools are listed
- [x] GitHub repository link works
- [x] Version number is correct
- [x] npm-style package identifier displays
- [x] stdio transport type configured

---

## 🆘 Troubleshooting

### **Entry Not Showing in Registry UI**

**Problem:** Entry added to seed.json but not visible in UI

**Solution:** Check `registryType` and `transport`:
```json
{
  "packages": [
    {
      "registryType": "npm",  // ✅ Use "npm" not "git"
      "transport": {
        "type": "stdio"  // ✅ Use "stdio" not "http"
      }
    }
  ]
}
```

### **Invalid JSON Error**

```bash
# Validate JSON
python3 -m json.tool seed.json

# Common issues:
# - Missing comma between entries
# - Trailing comma at end of array
# - Unescaped quotes in strings
```

### **Registry Won't Start**

```bash
# Check port 8080 is available
lsof -i :8080

# View logs
npm start --verbose
```

---

## 🎉 Summary

**✅ Successfully Published!**

Your PostgreSQL MCP server is now:
1. ✅ Visible in local registry UI at `localhost:8080`
2. ✅ Searchable by name or description
3. ✅ Showing all 8 tools
4. ✅ Displaying correct metadata
5. ✅ Using npm/stdio configuration for compatibility

**Key Learning:**
- Local MCP registry requires `"registryType": "npm"` for UI display
- Transport type must be `"stdio"` (not `"http"`)
- npm-style scoped package naming: `@syedmajidraza/mcp-postgres`

---

## 📞 Support

- **Registry Issues:** Check your local registry documentation
- **PostgreSQL MCP Issues:** https://github.com/syedmajidraza/mcp-postgres/issues
- **Documentation:** See main [README.md](README.md)

---

**Your PostgreSQL MCP server is now live in your internal registry! 🚀**
