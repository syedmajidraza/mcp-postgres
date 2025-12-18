# Bug Fix: Natural Language Query Routing

**Date:** December 17, 2025
**Version:** 1.0.0 (post-registry-publishing)
**Status:** ✅ Fixed

---

## Problem Description

When users attempted natural language queries through the `@postgres` chat participant, they encountered SQL syntax errors:

### Symptoms

**User Input:**
```
@postgres create a table for product reviews with id, product name, rating 1-5, and comment
```

**Error:**
```
❌ Query failed: syntax error at or near 'a'
```

**Root Cause:**
The extension's routing logic in `handleChatRequest` was incorrectly detecting natural language queries containing certain keywords (like "create", "select") as direct SQL statements, bypassing the LLM generation entirely.

---

## Technical Details

### File Modified
[vscode-extension/src/extension.ts](vscode-extension/src/extension.ts)

### Changes Made

#### 1. Fixed Request Routing Logic ([extension.ts:203-256](vscode-extension/src/extension.ts#L203-L256))

**Before:**
```typescript
// Old logic - simple keyword matching
if (request.command === 'query' || lowerPrompt.includes('select ')) {
    await handleQueryRequest(userPrompt, baseUrl, stream);
} else if (request.command === 'tables' ||
           lowerPrompt.includes('list tables') ||
           lowerPrompt.includes('show tables')) {
    await handleListTablesRequest(baseUrl, stream);
} else if (request.command === 'create') {
    await handleCreateRequest(userPrompt, baseUrl, stream);
} else {
    await handleGeneralRequest(userPrompt, baseUrl, stream);
}
```

**After:**
```typescript
// New logic - proper SQL vs natural language detection
if (request.command === 'query') {
    await handleQueryRequest(userPrompt, baseUrl, stream);
} else if (request.command === 'tables') {
    await handleListTablesRequest(baseUrl, stream);
} else if (request.command === 'describe') {
    await handleDescribeTableRequest(userPrompt, baseUrl, stream);
} else if (request.command === 'create') {
    await handleCreateRequest(userPrompt, baseUrl, stream);
} else {
    // Determine if it's direct SQL or natural language
    const isDirectSQL = /^(select|insert|update|delete|create\s+(table|index|view|procedure|function)|alter|drop)\s+/i.test(lowerPrompt);

    if (isDirectSQL) {
        // Execute as direct SQL
        if (lowerPrompt.startsWith('select')) {
            await handleQueryRequest(userPrompt, baseUrl, stream);
        } else {
            await handleModificationRequest(userPrompt, baseUrl, stream);
        }
    } else {
        // Use LLM for natural language queries
        await handleGeneralRequest(userPrompt, baseUrl, stream);
    }
}
```

**Key Improvement:**
- Uses regex pattern matching with `^` anchor to ensure SQL keywords appear **at the start** of the prompt
- Distinguishes between "create table products" (direct SQL) and "create a table for products" (natural language)
- Properly routes slash commands (`/query`, `/tables`, `/describe`, `/create`)
- All other queries go through LLM generation

#### 2. Simplified `handleGeneralRequest` ([extension.ts:458-513](vscode-extension/src/extension.ts#L458-L513))

**Before:**
```typescript
async function handleGeneralRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    const lowerPrompt = prompt.toLowerCase();

    // Duplicate SQL detection - now removed
    if (lowerPrompt.startsWith('select ') ||
        lowerPrompt.startsWith('insert ') ||
        lowerPrompt.startsWith('create ')) {
        await handleQueryRequest(prompt, baseUrl, stream);
        return;
    }

    // LLM generation...
}
```

**After:**
```typescript
async function handleGeneralRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    // No duplicate SQL detection - routing is handled upstream
    try {
        stream.markdown('🤖 Analyzing your request and generating SQL...\n\n');
        const sqlQuery = await generateSQLWithLLM(prompt, baseUrl);

        // Added logging for debugging
        outputChannel.appendLine(`[LLM Generated SQL]: ${sqlQuery}`);

        // Execute the generated SQL...
    } catch (error: any) {
        outputChannel.appendLine(`[LLM Error]: ${error.message}`);
        // Error handling...
    }
}
```

**Key Improvements:**
- Removed duplicate SQL detection (handled in routing layer)
- Added logging for generated SQL and errors to Output channel
- Cleaner separation of concerns

---

## Query Type Detection Matrix

| User Input | Detection | Route | Tool Used |
|------------|-----------|-------|-----------|
| `@postgres /tables` | Slash command | `handleListTablesRequest` | `list_tables` |
| `@postgres /query SELECT * FROM users` | Slash command | `handleQueryRequest` | `query_database` |
| `@postgres SELECT * FROM users` | Direct SQL (starts with SELECT) | `handleQueryRequest` | `query_database` |
| `@postgres CREATE TABLE users (id INT)` | Direct SQL (starts with CREATE TABLE) | `handleModificationRequest` | `execute_sql` |
| `@postgres show all tables` | Natural language | `handleGeneralRequest` → LLM | Generated SQL |
| `@postgres create a table for reviews` | Natural language | `handleGeneralRequest` → LLM | Generated SQL |
| `@postgres what's the average salary?` | Natural language | `handleGeneralRequest` → LLM | Generated SQL |

---

## Testing

### Test Cases Verified

1. **Natural Language Table Creation:**
   ```
   @postgres create a table for product reviews with id, product name, rating 1-5, and comment
   ```
   **Expected:** LLM generates proper CREATE TABLE statement
   **Result:** ✅ Routed to `handleGeneralRequest`, SQL generated via LLM

2. **Direct SQL:**
   ```
   @postgres SELECT * FROM employees WHERE salary > 70000
   ```
   **Expected:** Execute SQL directly without LLM
   **Result:** ✅ Routed to `handleQueryRequest`, executed as-is

3. **Slash Commands:**
   ```
   @postgres /tables
   ```
   **Expected:** List all tables
   **Result:** ✅ Routed to `handleListTablesRequest`

4. **Natural Language Queries:**
   ```
   @postgres what's the minimum salary of employees?
   @postgres show top 10 highest paid employees
   ```
   **Expected:** LLM generates SELECT statements
   **Result:** ✅ Routed to `handleGeneralRequest`, SQL generated

---

## Files Changed

1. **[vscode-extension/src/extension.ts](vscode-extension/src/extension.ts)**
   - Modified `handleChatRequest` routing logic (lines 203-256)
   - Simplified `handleGeneralRequest` (lines 458-513)
   - Added logging for debugging

2. **Auto-generated:**
   - `vscode-extension/out/extension.js` - Compiled TypeScript
   - `vscode-extension/postgres-mcp-copilot-1.0.0.vsix` - Updated VSIX package
   - `postgres-mcp-v1.0.0.tar.gz` - Updated distribution package

---

## Installation for Users

### Option 1: Reinstall Extension

1. **Uninstall old extension:**
   - VS Code → Extensions → PostgreSQL MCP → Uninstall

2. **Install updated extension:**
   ```bash
   # Download updated package
   tar -xzf postgres-mcp-v1.0.0.tar.gz
   cd postgres-mcp-package
   ```

3. **Install VSIX:**
   - `Cmd+Shift+P` → "Extensions: Install from VSIX"
   - Select `postgres-mcp-copilot-1.0.0.vsix`

4. **Reload VS Code:**
   - `Cmd+Shift+P` → "Developer: Reload Window"

### Option 2: Update from Registry

If published to internal registry:
1. Open `http://localhost:8080`
2. Find "PostgreSQL MCP Server"
3. Click "Update" if available

---

## Debugging

If issues persist, check the **Output panel** for detailed logs:

1. View → Output
2. Select "PostgreSQL MCP" from dropdown
3. Look for:
   ```
   [LLM Generated SQL]: CREATE TABLE product_reviews (...)
   [LLM Error]: GitHub Copilot is not available
   [SERVER] 200 POST /mcp/v1/tools/call
   ```

**Common Issues:**
- `GitHub Copilot is not available` → Ensure Copilot is active (check status bar)
- `MCP server is not running` → Start server via Command Palette
- `syntax error at or near` → Check Output panel for generated SQL

---

## Performance Impact

- **Compilation time:** ~2-3 seconds
- **Package size:** 871 KB (unchanged)
- **Runtime impact:** Minimal - single regex check per query

---

## Rollback Instructions

If the fix causes issues, revert to previous version:

```bash
git checkout HEAD~1 vscode-extension/src/extension.ts
cd vscode-extension
npm run compile
npm run package
```

---

## Next Steps

1. ✅ **Compile extension** - `npm run compile`
2. ✅ **Package extension** - `npm run package`
3. ✅ **Create distribution** - `./create-package.sh`
4. 🔄 **Update registry** - Update version in `seed.json` if needed
5. 📢 **Notify users** - Share updated `postgres-mcp-v1.0.0.tar.gz`

---

## Summary

**Problem:** Natural language queries with SQL keywords (like "create a table") were incorrectly treated as direct SQL statements, causing syntax errors.

**Solution:** Improved routing logic to use regex pattern matching with start-of-string anchors (`^`) to distinguish between:
- Direct SQL: `CREATE TABLE users (...)`
- Natural language: `create a table for users`

**Impact:** Natural language queries now properly route through LLM generation, while direct SQL queries execute immediately.

**Status:** ✅ **Fixed and tested**

---

**Related Files:**
- [LOCAL_REGISTRY_SETUP.md](LOCAL_REGISTRY_SETUP.md) - Registry publishing guide
- [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) - Query examples
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Complete testing guide
