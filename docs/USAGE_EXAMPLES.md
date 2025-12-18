# PostgreSQL MCP - Complete Usage Examples

## 📖 Documentation Index

- **[DDL_EXAMPLES.md](DDL_EXAMPLES.md)** - Comprehensive database development guide:
  - Creating tables with constraints and foreign keys
  - Creating indexes (B-tree, GIN, partial, unique)
  - Creating stored procedures with transaction handling
  - Creating functions (scalar, table-returning, JSON)
  - Creating triggers (audit, validation, timestamp)
  - Creating views and materialized views
  - Complex SQL queries (CTEs, window functions, recursive queries)
  - Natural language examples for all operations

## ✅ Server Status Check

**Check if MCP server is running:**
```bash
curl http://127.0.0.1:3000/health
```

**Expected Response:**
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

**If server not running, start it:**
```bash
cd /Users/syedraza/postgres-mcp/mcp-server
./venv/bin/python3 server.py
```

---

## 📚 Complete Query Examples

### 1. List Tables

**✅ WORKS - Using slash command:**
```
@postgres /tables
```

**✅ WORKS - Natural language (after reinstalling extension):**
```
@postgres show tables
@postgres list tables
@postgres get tables
@postgres all tables
@postgres give me tables
@postgres display tables
```

**Expected Output:**
```
Found 2 tables:
- employees (BASE TABLE)
- suppliers (BASE TABLE)
```

---

### 2. Describe Table Structure

**✅ WORKS - Using slash command:**
```
@postgres /describe employees
@postgres /describe suppliers
```

**✅ WORKS - Natural language (after reinstalling extension):**
```
@postgres describe the employees table
@postgres describe employees
```

**Expected Output:**
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

### 3. Count Queries (How Many)

**✅ WORKS - Natural language (after reinstalling extension):**
```
@postgres How many employees have salary greater than 70000?
```
**Generated SQL:** `SELECT COUNT(*) as count FROM employees WHERE salary > 70000`

**More examples:**
```
@postgres How many employees are there?
@postgres count employees
c
@postgres How many employees in Engineering department?
```

**Expected Output:**
```sql
Executing query:
SELECT COUNT(*) as count FROM employees WHERE salary > 70000

Result: 1 rows match your criteria
```

---

### 4. Show/Get/Find Queries

**✅ WORKS - Natural language (after reinstalling extension):**
```
@postgres Show me all employees
@postgres Get all employees
@postgres Find employees with salary greater than 70000
@postgres Show suppliers
```

**Generated SQL:** `SELECT * FROM employees LIMIT 50`

**Expected Output:**
```
Results: 3 rows

employeeid | firstname | lastname | department  | salary
-----------|-----------|----------|-------------|--------
1          | John      | Doe      | Engineering | 75000
2          | Jane      | Smith    | Marketing   | 65000
3          | Alice     | Johnson  | HR          | 60000
```

---

### 5. Direct SQL Queries

**✅ WORKS - Direct SQL:**
```
@postgres SELECT * FROM employees

@postgres SELECT firstname, lastname, salary FROM employees WHERE department = 'Engineering'

@postgres SELECT * FROM employees WHERE salary > 70000

@postgres SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department

@postgres SELECT * FROM employees ORDER BY salary DESC LIMIT 5
```

**Expected Output:**
```
Results: [number] rows
[formatted table with results]
```

---

### 6. Aggregate Queries

**✅ WORKS - Natural language (after reinstalling extension):**

**Average:**
```
@postgres What is the average salary?
@postgres average of salary
```
**Generated SQL:** `SELECT AVG(salary) as result FROM employees`

**Maximum:**
```
@postgres What's the maximum salary?
@postgres max salary
```
**Generated SQL:** `SELECT MAX(salary) as result FROM employees`

**Minimum:**
```
@postgres minimum salary of employees
```
**Generated SQL:** `SELECT MIN(salary) as result FROM employees`

**Sum:**
```
@postgres sum of all salaries
@postgres total salary
```
**Generated SQL:** `SELECT SUM(salary) as result FROM employees`

**Expected Output:**
```sql
Executing query:
SELECT AVG(salary) as result FROM employees

Result: 66666.67
```

---

### 7. Insert Data

**✅ WORKS - Direct SQL:**
```
@postgres INSERT INTO employees (firstname, lastname, department, salary) VALUES ('Bob', 'Wilson', 'IT', 72000)

@postgres INSERT INTO employees (firstname, lastname, department, salary) VALUES ('Sarah', 'Davis', 'Sales', 58000)
```

**Expected Output:**
```
✅ Statement executed: INSERT 0 1
```

---

### 8. Update Data

**✅ WORKS - Direct SQL:**
```
@postgres UPDATE employees SET salary = 80000 WHERE employeeid = 1

@postgres UPDATE employees SET department = 'Product' WHERE firstname = 'Jane'

@postgres UPDATE employees SET salary = salary * 1.1 WHERE department = 'Engineering'
```

**Expected Output:**
```
✅ Statement executed: UPDATE 1
```

---

### 9. Delete Data

**✅ WORKS - Direct SQL:**
```
@postgres DELETE FROM employees WHERE employeeid = 999

@postgres DELETE FROM employees WHERE salary < 50000
```

**Expected Output:**
```
✅ Statement executed: DELETE 1
```

---

### 10. Create Table

**✅ WORKS - Direct SQL:**
```
@postgres CREATE TABLE test_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

@postgres CREATE TABLE products (
  product_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2),
  stock_quantity INTEGER DEFAULT 0
)
```

**Expected Output:**
```
✅ Statement executed: CREATE TABLE
```

---

### 11. Create Stored Procedure/Function

**✅ WORKS - Direct SQL (proper PostgreSQL syntax):**
```
@postgres CREATE OR REPLACE FUNCTION get_employee_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM employees);
END;
$$ LANGUAGE plpgsql;
```

**Another example:**
```
@postgres CREATE OR REPLACE FUNCTION calculate_bonus(emp_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  emp_salary NUMERIC;
BEGIN
  SELECT salary INTO emp_salary FROM employees WHERE employeeid = emp_id;
  RETURN emp_salary * 0.1;
END;
$$ LANGUAGE plpgsql;
```

**Expected Output:**
```
✅ Statement executed: CREATE FUNCTION
```

---

### 12. Drop Table

**✅ WORKS - Direct SQL:**
```
@postgres DROP TABLE IF EXISTS test_users

@postgres DROP TABLE products
```

**Expected Output:**
```
✅ Statement executed: DROP TABLE
```

---

## ❌ What DOESN'T Work (Natural Language Limitations)

### These require proper SQL syntax:

**❌ Won't work:**
```
@postgres create a stored procedure to calculate bonus
```
**Why:** Stored procedures require specific PostgreSQL syntax. Use proper SQL instead.

**❌ Won't work:**
```
@postgres make a table called users with name and email
```
**Why:** Table creation needs proper column types. Use CREATE TABLE with full syntax.

**✅ Use this instead:**
```
@postgres CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100)
)
```

---

## 🎯 Best Practices

### 1. Use Slash Commands for Quick Operations
```
@postgres /tables          → Fast way to list tables
@postgres /describe [name] → Fast way to see table structure
```

### 2. Use Natural Language for Simple Queries
```
@postgres How many employees...    → Counts
@postgres Show me all...           → Select all
@postgres What's the average...    → Aggregates
```

### 3. Use Direct SQL for Complex Operations
```
@postgres SELECT ... FROM ... JOIN ... WHERE ...
@postgres CREATE TABLE ... (column definitions)
@postgres CREATE FUNCTION ... RETURNS ... AS $$...$$
```

---

## 🔧 Troubleshooting

### Issue: "MCP server is not running"

**Check:**
```bash
curl http://127.0.0.1:3000/health
```

**Start server:**
```bash
cd /Users/syedraza/postgres-mcp/mcp-server
./venv/bin/python3 server.py
```

### Issue: Extension shows help message instead of results

**Solution:**
1. Make sure you installed the latest `.vsix` file
2. Reload VS Code: `Cmd+Shift+P` → "Developer: Reload Window"
3. Wait 2-3 seconds for extension to activate
4. Try again

### Issue: Syntax error when creating stored procedures

**Problem:** You're using natural language instead of SQL syntax

**Solution:** Use proper PostgreSQL function syntax:
```sql
CREATE OR REPLACE FUNCTION function_name(params)
RETURNS return_type AS $$
BEGIN
  -- function body
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Your Current Database

**Tables:**
- `employees` (employeeid, firstname, lastname, department, salary)
- `suppliers` (structure varies)

**Sample Data in employees:**
- John Doe, Engineering, $75,000
- Jane Smith, Marketing, $65,000
- Alice Johnson, HR, $60,000

---

## 🚀 Quick Test Sequence

After installing/updating the extension, test in this order:

1. **Slash command:** `@postgres /tables`
2. **Describe:** `@postgres /describe employees`
3. **Natural language list:** `@postgres show tables`
4. **Count query:** `@postgres How many employees have salary greater than 70000?`
5. **Show query:** `@postgres Show me all employees`
6. **Direct SQL:** `@postgres SELECT * FROM employees WHERE salary > 60000`
7. **Aggregate:** `@postgres What's the average salary?`

If steps 1-2 work but 3-7 don't, you need to reinstall the extension.

---

## 📦 Extension Installation

**Location:** `/Users/syedraza/postgres-mcp/vscode-extension/postgres-mcp-copilot-1.0.0.vsix`

**Install:**
1. Uninstall old version in VS Code Extensions
2. `Cmd+Shift+P` → "Extensions: Install from VSIX"
3. Select the `.vsix` file
4. Reload window: `Cmd+Shift+P` → "Developer: Reload Window"

---

## 🎓 For Your Developers

Share these quick examples:

**Quick data check:**
```
@postgres How many orders today?
@postgres Show me recent customers
@postgres What's the total revenue?
```

**Exploration:**
```
@postgres show tables
@postgres describe users table
```

**Ad-hoc queries:**
```
@postgres SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'
```

No need to open pgAdmin or terminal - everything in VS Code!

---

## ✅ Summary

**What works NOW (with slash commands):**
- ✅ `/tables` - List tables
- ✅ `/describe [table]` - Show table structure

**What works AFTER reinstalling extension:**
- ✅ Natural language queries (show, get, count, how many)
- ✅ Aggregate functions (average, sum, max, min)
- ✅ Direct SQL (all SQL statements)

**Always works:**
- ✅ Direct SQL queries
- ✅ INSERT, UPDATE, DELETE statements
- ✅ CREATE TABLE, DROP TABLE
- ✅ CREATE FUNCTION (with proper syntax)

---

Need help? Check the server status first, then verify extension is loaded!
