# PostgreSQL MCP - Complete Testing Guide

## Current Status

✅ **MCP Server:** Running at http://127.0.0.1:3000
✅ **Database:** Connected to Adventureworks on port 5431
✅ **Extension:** Package ready at `vscode-extension/postgres-mcp-copilot-1.0.0.vsix`

---

## Installation Steps

### 1. Install/Update VS Code Extension

**Uninstall old version (if exists):**
```
1. Open VS Code Extensions (Cmd+Shift+X / Ctrl+Shift+X)
2. Search for "PostgreSQL MCP" or "Syed"
3. Click gear icon → Uninstall
```

**Install new version:**
```
1. Press Cmd+Shift+P (macOS) or Ctrl+Shift+P (Windows/Linux)
2. Type "Extensions: Install from VSIX"
3. Select: /Users/syedraza/postgres-mcp/vscode-extension/postgres-mcp-copilot-1.0.0.vsix
4. Click Install
5. Reload VS Code window (Cmd+Shift+P → "Developer: Reload Window")
```

### 2. Verify MCP Server Status

**Check server is running:**
```bash
curl http://127.0.0.1:3000/health
```

**Expected response:**
```json
{
  "status": "running",
  "database": "connected",
  "config": {
    "host": "localhost",
    "port": 5431,
    "database": "Adventureworks"
  }
}
```

**If server is not running, start it:**
```bash
cd /Users/syedraza/postgres-mcp/mcp-server
./venv/bin/python3 server.py
```

---

## Testing All Query Types

### ✅ Test 1: List Tables (Multiple Variations)

**Using slash command:**
```
@postgres /tables
```

**Natural language variations:**
```
@postgres show tables
@postgres list tables
@postgres get tables
@postgres all tables
@postgres give me tables
@postgres display tables
```

**Expected output:**
```
Found 2 tables:
- employees (BASE TABLE)
- suppliers (BASE TABLE)
```

---

### ✅ Test 2: Describe Table

**Using slash command:**
```
@postgres /describe employees
```

**Natural language:**
```
@postgres describe the employees table
@postgres describe employees
```

**Expected output:**
```
Describing table: employees
Columns (5):
- employeeid: integer NOT NULL
- firstname: character varying NULL
- lastname: character varying NULL
- department: character varying NULL
- salary: numeric NULL
```

---

### ✅ Test 3: Count Queries

**Natural language:**
```
@postgres How many employees have salary greater than 70000?
@postgres count employees
@postgres How many employees are there?
```

**Expected output:**
```sql
Executing query:
SELECT COUNT(*) as count FROM employees WHERE salary > 70000

Result: 1 rows match your criteria
```

---

### ✅ Test 4: Show/Find Queries

**Natural language:**
```
@postgres Show me all employees
@postgres Find employees with salary greater than 70000
@postgres Get all employees in Engineering department
@postgres Show suppliers
```

**Expected output:**
```sql
Executing query:
SELECT * FROM employees LIMIT 50

Results: 3 rows
[formatted table]
```

---

### ✅ Test 5: Aggregate Queries

**Average:**
```
@postgres What is the average salary?
@postgres average of salary
```

**Max/Min:**
```
@postgres What's the maximum salary?
@postgres minimum salary
```

**Sum:**
```
@postgres sum of all salaries
```

**Expected output:**
```sql
Executing query:
SELECT AVG(salary) as result FROM employees

Result: 66666.67
```

---

### ✅ Test 6: Direct SQL Queries

**SELECT queries:**
```
@postgres SELECT firstname, lastname, salary FROM employees WHERE department = 'Engineering' ORDER BY salary DESC

@postgres SELECT * FROM employees WHERE salary > 70000

@postgres SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department
```

**Expected:** Executes query and returns formatted results

---

### ✅ Test 7: Data Modification

**INSERT:**
```
@postgres INSERT INTO employees (firstname, lastname, department, salary) VALUES ('Bob', 'Wilson', 'IT', 72000)
```

**UPDATE:**
```
@postgres UPDATE employees SET salary = 80000 WHERE employeeid = 1
```

**DELETE:**
```
@postgres DELETE FROM employees WHERE employeeid = 999
```

**Expected:**
```
✅ Statement executed: INSERT 0 1
```

---

### ✅ Test 8: Create Table

```
@postgres CREATE TABLE test_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Expected:**
```
✅ Statement executed: CREATE TABLE
```

---

## Troubleshooting

### Issue: Extension shows help message instead of executing

**Solution:**
1. Make sure you installed the latest .vsix file
2. Reload VS Code window (Cmd+Shift+P → "Developer: Reload Window")
3. Check extension is active in Extensions panel

### Issue: "MCP server is not running"

**Check server status:**
```bash
curl http://127.0.0.1:3000/health
```

**Start server manually:**
```bash
cd /Users/syedraza/postgres-mcp/mcp-server
./venv/bin/python3 server.py
```

**Or use VS Code command:**
```
Cmd+Shift+P → "PostgreSQL MCP: Start Server"
```

### Issue: Database connection errors

**Verify PostgreSQL is running:**
```bash
psql -h localhost -p 5431 -U postgres -d Adventureworks -c "SELECT 1"
```

**Check .env file:**
```bash
cat /Users/syedraza/postgres-mcp/mcp-server/.env
```

Should show:
```
DB_HOST=localhost
DB_PORT=5431
DB_NAME=Adventureworks
DB_USER=postgres
DB_PASSWORD=postgres
```

---

## Current Database Tables

Your database has these tables:

### employees
- employeeid (integer, PRIMARY KEY)
- firstname (varchar)
- lastname (varchar)
- department (varchar)
- salary (numeric)

### suppliers
(Structure varies based on your schema)

---

## Quick Command Reference

| Command | Description |
|---------|-------------|
| `@postgres /tables` | List all tables |
| `@postgres /describe [table]` | Describe table structure |
| `@postgres /query [SQL]` | Execute SELECT query |
| `@postgres show tables` | Natural language: list tables |
| `@postgres How many employees...` | Natural language: count query |
| `@postgres Show me all [table]` | Natural language: select all |
| `@postgres What's the average [column]?` | Natural language: aggregate |

---

## Testing Checklist

After installing the extension:

- [ ] Extension appears in Extensions list
- [ ] Status bar shows "PostgreSQL MCP: Running" or "Stopped"
- [ ] Command palette shows PostgreSQL MCP commands
- [ ] `@postgres /tables` returns table list
- [ ] `@postgres /describe employees` shows table structure
- [ ] `@postgres show tables` works (natural language)
- [ ] `@postgres How many employees...` works (natural language)
- [ ] `@postgres Show me all employees` works (natural language)
- [ ] Direct SQL queries work
- [ ] INSERT/UPDATE/DELETE statements work

---

## Next Steps

1. **Install the extension** using the steps above
2. **Reload VS Code** to activate changes
3. **Test slash commands** first (`/tables`, `/describe`)
4. **Test natural language** queries
5. **Report any issues** you encounter

---

## Support

- **Server logs:** Check MCP server terminal output
- **Extension logs:** View → Output → PostgreSQL MCP
- **Database logs:** Check PostgreSQL logs if connection fails

Happy querying! 🚀
