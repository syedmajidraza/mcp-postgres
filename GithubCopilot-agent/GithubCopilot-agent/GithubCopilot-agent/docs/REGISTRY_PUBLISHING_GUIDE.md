# PostgreSQL MCP - Registry Publishing Guide

## Overview

This guide explains how to publish your PostgreSQL MCP server to your internal MCP registry so developers can discover and install it.

---

## 📋 What You Have

1. ✅ **Registry Entry** - `registry-entry.json` (MCP server metadata)
2. ✅ **Package Metadata** - `mcp-server/package.json` (npm-compatible)
3. ✅ **GitHub Repository** - https://github.com/syedmajidraza/mcp-postgres.git
4. ✅ **Distribution Package** - `postgres-mcp-v1.0.0.tar.gz`

---

## 🎯 Publishing to Your MCP Registry

### **Step 1: Add Entry to Your Registry's Seed File**

Your MCP registry has a seed file (similar to the official MCP registry). Add your PostgreSQL MCP entry to it.

**Location of your registry seed file:**
```
your-mcp-registry/
└── data/
    └── seed.json
```

**Add this entry to the seed.json array:**

```json
{
  "name": "postgres-mcp",
  "displayName": "PostgreSQL MCP Server",
  "description": "Natural language PostgreSQL database queries with LLM integration. Query, create tables, views, and stored procedures using plain English powered by GitHub Copilot.",
  "version": "1.0.0",
  "author": "Syed Majid Raza",
  "repository": {
    "type": "git",
    "url": "https://github.com/syedmajidraza/mcp-postgres.git"
  },
  "homepage": "https://github.com/syedmajidraza/mcp-postgres",
  "license": "MIT",
  "keywords": ["postgresql", "database", "sql", "llm", "natural-language", "github-copilot"],
  "categories": ["database", "productivity", "developer-tools"],
  "runtime": "python",
  "installationType": "local",
  "installation": {
    "type": "git",
    "url": "https://github.com/syedmajidraza/mcp-postgres.git",
    "steps": [
      "git clone https://github.com/syedmajidraza/mcp-postgres.git",
      "cd mcp-postgres",
      "./install.sh",
      "Configure database in ~/.postgres-mcp/mcp-server/.env",
      "Install VS Code extension from postgres-mcp-copilot-1.0.0.vsix"
    ]
  },
  "tools": [
    {"name": "list_tables", "description": "List all tables in a PostgreSQL schema"},
    {"name": "describe_table", "description": "Get detailed schema information for a specific table"},
    {"name": "query_database", "description": "Execute a SELECT query on the PostgreSQL database"},
    {"name": "execute_sql", "description": "Execute any SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.)"},
    {"name": "create_table", "description": "Create a new table in the database"},
    {"name": "create_stored_procedure", "description": "Create a stored procedure or function"},
    {"name": "get_table_indexes", "description": "Get all indexes for a specific table"},
    {"name": "analyze_query_plan", "description": "Analyze and explain query execution plan"}
  ],
  "features": [
    "Natural language to SQL conversion using GitHub Copilot LLM",
    "8 comprehensive PostgreSQL tools for database operations",
    "VS Code extension with start/stop/status controls",
    "Schema-aware SQL generation",
    "Support for complex queries (JOINs, subqueries, aggregations)"
  ],
  "requirements": {
    "python": ">=3.8",
    "vscode": ">=1.80.0",
    "extensions": ["GitHub Copilot"],
    "database": "PostgreSQL >=10.0"
  },
  "endpoints": {
    "health": "http://127.0.0.1:3000/health",
    "mcpV1": "http://127.0.0.1:3000/mcp/v1"
  },
  "documentation": {
    "quickStart": "https://github.com/syedmajidraza/mcp-postgres/blob/main/DEVELOPER_QUICK_START.md",
    "implementation": "https://github.com/syedmajidraza/mcp-postgres/blob/main/IMPLEMENTATION_SUMMARY.md",
    "llmGuide": "https://github.com/syedmajidraza/mcp-postgres/blob/main/LLM_ENHANCED_GUIDE.md"
  }
}
```

---

### **Step 2: Commit to Your Registry Repository**

```bash
cd your-mcp-registry
git add data/seed.json
git commit -m "Add PostgreSQL MCP Server v1.0.0

- Natural language PostgreSQL queries
- 8 database tools
- VS Code extension with LLM integration
- GitHub Copilot powered"
git push origin main
```

---

### **Step 3: Developer Installation Flow**

Once published to your registry, developers can install it:

#### **Option A: From Your Registry UI**

If your MCP registry has a web UI (like Smithery):

1. Browse to your registry: `https://your-mcp-registry.com`
2. Search for "PostgreSQL MCP"
3. Click "Install"
4. Follow installation steps shown

#### **Option B: Manual Installation from GitHub**

```bash
# 1. Clone from GitHub
git clone https://github.com/syedmajidraza/mcp-postgres.git
cd mcp-postgres

# 2. Run installer
./install.sh

# 3. Configure database
nano ~/.postgres-mcp/mcp-server/.env
# Update: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# 4. Install VS Code extension
# Open VS Code
# Cmd+Shift+P → "Extensions: Install from VSIX"
# Select: postgres-mcp-copilot-1.0.0.vsix

# 5. Reload VS Code
# Cmd+Shift+P → "Developer: Reload Window"

# 6. Start using
# Type: @postgres show tables
```

---

## 🔧 Registry Configuration Files

### **File 1: `registry-entry.json`** (Root of your project)

This is the complete registry entry with all metadata. Use this as reference when updating your registry.

**Location:** `/Users/syedraza/postgres-mcp/registry-entry.json`

### **File 2: `mcp-server/package.json`** (npm-compatible)

This allows developers to use npm/npx if your registry supports it.

**Location:** `/Users/syedraza/postgres-mcp/mcp-server/package.json`

---

## 📦 Alternative: Internal NPM Registry

If your organization has an internal npm registry (like Verdaccio or Artifactory):

### **Step 1: Configure npm to use internal registry**

```bash
npm config set registry https://your-npm-registry.com
```

### **Step 2: Login to registry**

```bash
npm login --registry=https://your-npm-registry.com
```

### **Step 3: Publish MCP server package**

```bash
cd /Users/syedraza/postgres-mcp/mcp-server

# Update package.json with your org scope
# Change: "@your-org/postgres-mcp" to "@yourcompany/postgres-mcp"

# Publish
npm publish --registry=https://your-npm-registry.com
```

### **Developer Installation:**

```bash
npm install -g @yourcompany/postgres-mcp
```

---

## 🌐 Alternative: Internal File Server/Web Server

If you want to host the distribution package on an internal web server:

### **Step 1: Upload package to web server**

```bash
# Upload the tarball
scp postgres-mcp-v1.0.0.tar.gz user@internal-server:/var/www/mcp-packages/

# Create index/catalog file
cat > /var/www/mcp-packages/catalog.json << 'CATALOG_EOF'
{
  "packages": [
    {
      "name": "postgres-mcp",
      "version": "1.0.0",
      "description": "PostgreSQL MCP Server with LLM integration",
      "downloadUrl": "https://internal-server.com/mcp-packages/postgres-mcp-v1.0.0.tar.gz",
      "documentation": "https://github.com/syedmajidraza/mcp-postgres",
      "author": "Syed Majid Raza",
      "tools": 8,
      "runtime": "python"
    }
  ]
}
CATALOG_EOF
```

### **Step 2: Share download URL**

```
Download: https://internal-server.com/mcp-packages/postgres-mcp-v1.0.0.tar.gz
Catalog: https://internal-server.com/mcp-packages/catalog.json
```

### **Developer Installation:**

```bash
# Download
wget https://internal-server.com/mcp-packages/postgres-mcp-v1.0.0.tar.gz

# Extract
tar -xzf postgres-mcp-v1.0.0.tar.gz

# Install
cd postgres-mcp-package
./install.sh
```

---

## 🔄 Updating Your Published MCP Server

### **When you release a new version:**

```bash
# 1. Update version in files
nano vscode-extension/package.json
# Change: "version": "1.0.0" → "1.1.0"

nano mcp-server/package.json
# Change: "version": "1.0.0" → "1.1.0"

nano registry-entry.json
# Change: "version": "1.0.0" → "1.1.0"

# 2. Rebuild extension
cd vscode-extension
npm run compile
npm run package  # Creates postgres-mcp-copilot-1.1.0.vsix

# 3. Rebuild distribution package
cd ..
./create-package.sh

# 4. Commit to GitHub
git add .
git commit -m "Release v1.1.0 - [describe changes]"
git tag v1.1.0
git push origin main --tags

# 5. Update your MCP registry
cd your-mcp-registry
nano data/seed.json
# Update version to "1.1.0"
git commit -m "Update PostgreSQL MCP to v1.1.0"
git push
```

---

## 📊 Registry Entry Fields Explained

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Unique identifier | `"postgres-mcp"` |
| `displayName` | Human-readable name | `"PostgreSQL MCP Server"` |
| `description` | Brief summary | `"Natural language PostgreSQL queries..."` |
| `version` | Semantic version | `"1.0.0"` |
| `repository.url` | GitHub repo | `"https://github.com/..."` |
| `runtime` | Runtime environment | `"python"` |
| `installationType` | Installation method | `"local"` (runs on developer's machine) |
| `tools` | Array of MCP tools | List of 8 tools with descriptions |
| `features` | Key capabilities | Natural language, LLM integration, etc. |
| `requirements` | Dependencies | Python 3.8+, VS Code, Copilot |
| `endpoints` | Server URLs | Health check, MCP API endpoints |

---

## ✅ Verification Checklist

After publishing to your registry, verify:

- [ ] Entry appears in your MCP registry UI/catalog
- [ ] GitHub repository is accessible
- [ ] Documentation links work
- [ ] Installation instructions are correct
- [ ] Version numbers match across all files
- [ ] Developers can successfully install from registry

---

## 🎯 Summary

**You have three options to publish:**

### **Option 1: Internal MCP Registry (Recommended)**
- Add entry to `your-mcp-registry/data/seed.json`
- Developers browse and install from registry UI
- Centralized discovery and management

### **Option 2: Internal NPM Registry**
- Publish to internal npm registry (Verdaccio/Artifactory)
- Developers install via `npm install @yourcompany/postgres-mcp`
- Familiar npm workflow

### **Option 3: Internal Web Server**
- Host `postgres-mcp-v1.0.0.tar.gz` on internal server
- Provide download link and `catalog.json`
- Simplest setup, manual distribution

---

## 📝 Files Created

1. **`registry-entry.json`** - Complete MCP registry metadata
2. **`mcp-server/package.json`** - npm-compatible package metadata
3. **`REGISTRY_PUBLISHING_GUIDE.md`** - This guide

---

## 🆘 Support

**For developers installing from registry:**
- Quick Start: `DEVELOPER_QUICK_START.md`
- Full Documentation: `https://github.com/syedmajidraza/mcp-postgres`

**For registry administrators:**
- Contact: your-devops-team@company.com
- Issues: https://github.com/syedmajidraza/mcp-postgres/issues

---

**Your PostgreSQL MCP server is now ready to be published to your internal registry! 🚀**
