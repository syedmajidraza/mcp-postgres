# PostgreSQL MCP - Quick Reference Guide

## 🎯 What Your Solution Can Do

Your PostgreSQL MCP VSCode extension is now **production-ready** for professional database development. Here's everything it supports:

---

## ✅ Supported Database Operations

### 📊 Tables
```sql
-- Natural Language
@postgres create a users table with id, name, email, and created_at

-- Direct SQL
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### 📇 Indexes
```sql
-- Natural Language
@postgres create an index on the email column of users table

-- Direct SQL (All types supported)
CREATE INDEX idx_users_email ON users(email);                    -- B-tree
CREATE INDEX idx_orders_date ON orders(order_date DESC);         -- Composite
CREATE INDEX idx_active ON orders(status) WHERE status='active'; -- Partial
CREATE UNIQUE INDEX idx_username ON users(LOWER(username));      -- Unique
CREATE INDEX idx_data ON logs USING GIN(jsonb_data);            -- GIN for JSONB
```

### ⚙️ Stored Procedures
```sql
-- Natural Language
@postgres create a procedure to update order status

-- Direct SQL
CREATE OR REPLACE PROCEDURE update_status(order_id INT, new_status VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE orders SET status = new_status WHERE id = order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', order_id;
    END IF;
END;
$$
```

### 🔧 Functions
```sql
-- Natural Language
@postgres create a function to calculate total price with tax

-- Direct SQL (All types supported)
-- Scalar function
CREATE OR REPLACE FUNCTION calc_total(price DECIMAL, tax_rate DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
    RETURN price * (1 + tax_rate);
END;
$$;

-- Table-returning function
CREATE OR REPLACE FUNCTION get_top_products(limit_count INT)
RETURNS TABLE(product_id INT, name VARCHAR, revenue DECIMAL)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, SUM(oi.quantity * oi.price) AS revenue
    FROM products p
    JOIN order_items oi ON p.id = oi.product_id
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT limit_count;
END;
$$;
```

### 🎯 Triggers
```sql
-- Audit trigger
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit_log (table_name, action, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, TG_OP, current_user, CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION log_changes();
```

### 👁️ Views
```sql
-- Natural Language
@postgres create a view showing active customers

-- Direct SQL
CREATE OR REPLACE VIEW active_customers AS
SELECT c.*, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE c.status = 'active'
GROUP BY c.id;

-- Materialized view
CREATE MATERIALIZED VIEW monthly_sales AS
SELECT DATE_TRUNC('month', order_date) AS month, SUM(total) AS revenue
FROM orders
GROUP BY month;
```

### 🧩 Complex Queries

#### CTEs (Common Table Expressions)
```sql
@postgres show customers who spent more than average

-- Generates:
WITH avg_spend AS (
    SELECT AVG(total) AS avg_total FROM orders
)
SELECT c.name, SUM(o.total) AS total_spent
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.name
HAVING SUM(o.total) > (SELECT avg_total FROM avg_spend);
```

#### Window Functions
```sql
@postgres rank products by revenue in each category

-- Generates:
SELECT
    product_name,
    category,
    revenue,
    RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS category_rank
FROM product_sales;
```

#### Recursive Queries
```sql
-- Employee hierarchy
WITH RECURSIVE hierarchy AS (
    SELECT id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, h.level + 1
    FROM employees e
    JOIN hierarchy h ON e.manager_id = h.id
)
SELECT * FROM hierarchy;
```

---

## 🚀 Two Ways to Use

### 1️⃣ Natural Language (Best for Quick Tasks)
```
@postgres create a products table
@postgres show top 10 customers by revenue
@postgres create an index on order_date
@postgres calculate average salary by department
@postgres find customers who haven't ordered in 60 days
```

**The LLM will:**
- ✅ Fetch your database schema
- ✅ Generate production-quality SQL
- ✅ Include proper constraints, types, and error handling
- ✅ Show you the SQL before executing
- ✅ Execute and display results

### 2️⃣ Direct SQL (Best for Precision)
```sql
-- Just type SQL directly - it's detected automatically
SELECT * FROM employees WHERE salary > 70000

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    total DECIMAL(10,2) NOT NULL
)

CREATE OR REPLACE FUNCTION get_bonus(emp_id INT)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (SELECT salary * 0.1 FROM employees WHERE id = emp_id);
END;
$$
```

---

## 🎨 Special Features

### Multi-Statement Execution
```sql
-- Execute multiple DDL statements at once
CREATE TABLE products (id SERIAL PRIMARY KEY, name VARCHAR(100));
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_id ON products(id);
```

**Output:**
```
📋 Executing 3 statements...

✅ Statement 1/3: CREATE TABLE
✅ Statement 2/3: CREATE INDEX
✅ Statement 3/3: CREATE INDEX

Summary: 3/3 statements executed successfully
```

### Automatic CREATE OR REPLACE Detection
```sql
-- These are now properly detected as direct SQL (no LLM needed)
CREATE OR REPLACE FUNCTION my_func() RETURNS INT AS $$ ... $$;
CREATE OR REPLACE PROCEDURE my_proc() AS $$ ... $$;
CREATE OR REPLACE VIEW my_view AS SELECT ...;
```

### Smart $$ Delimiter Handling
```sql
-- Functions with $$ delimiters are treated as single statements
CREATE OR REPLACE FUNCTION complex_calc(param INT)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
    result DECIMAL;
BEGIN
    -- Complex logic with semicolons inside
    SELECT salary INTO result FROM employees WHERE id = param;
    RETURN result * 1.5;
END;
$$;
-- ✅ This is NOT split at internal semicolons
```

---

## 📚 Full Documentation

### Comprehensive Guides
- **[DDL_EXAMPLES.md](DDL_EXAMPLES.md)** - 40+ examples covering all DDL operations
  - Tables with all constraint types
  - All index types (B-tree, GIN, GIST, partial, unique)
  - Stored procedures with transaction handling
  - Functions (scalar, table-returning, JSON)
  - Triggers (audit, validation, timestamp)
  - Views and materialized views
  - Complex queries (CTEs, window functions, recursive)
  - Best practices and troubleshooting

- **[DATABASE_DEVELOPMENT_IMPROVEMENTS.md](DATABASE_DEVELOPMENT_IMPROVEMENTS.md)** - Technical details
  - What was fixed and improved
  - Code changes summary
  - Testing results
  - Known limitations
  - Future enhancements

- **[USAGE_EXAMPLES.md](USAGE_EXAMPLES.md)** - Basic usage examples
  - Server setup and status
  - Common query patterns
  - Natural language examples

---

## 💡 Natural Language Examples

### Querying
```
@postgres show all employees earning more than 70000
@postgres find the top 10 highest paid employees
@postgres how many orders were placed this month
@postgres what's the average salary by department
@postgres list customers who haven't ordered in 60 days
@postgres show products with inventory less than 10
@postgres calculate total revenue by category this year
```

### Creating Objects
```
@postgres create a customers table with id, name, email, phone
@postgres create an index on email for faster lookups
@postgres create a function to calculate customer lifetime value
@postgres create a procedure to process monthly invoices
@postgres create a view showing high-value customers
@postgres create a trigger to log changes to orders table
```

### Analysis
```
@postgres compare sales between this month and last month
@postgres find customers with declining order frequency
@postgres show inventory turnover rate by product
@postgres analyze order patterns by day of week
@postgres identify products frequently bought together
```

---

## ⚡ Performance Tips

1. **Use indexes** on columns in WHERE, JOIN, and ORDER BY
2. **Use partial indexes** when filtering common patterns
3. **Use GIN indexes** for JSONB and array columns
4. **Mark functions IMMUTABLE/STABLE** when appropriate
5. **Prefer set-based operations** over loops in PL/pgSQL
6. **Use CTEs** for complex multi-step queries
7. **Use EXPLAIN** to analyze query plans

---

## 🐛 Troubleshooting

### "Type datatype does not exist" Error
- **Cause:** LLM generated invalid SQL or referenced non-existent columns
- **Fix:** Check the generated SQL - it's shown before execution
- **Workaround:** Write direct SQL for complex operations

### Function creation fails
- **Check:** $$ delimiters match (opening and closing)
- **Check:** LANGUAGE plpgsql is specified
- **Check:** Parameter types and RETURNS clause are correct

### Multi-statement execution stops early
- **Expected:** Execution stops on first error (by design)
- **Fix:** Check the error message for the failing statement
- **Tip:** Test statements individually first

### CREATE OR REPLACE not working
- **Fixed:** Now properly detected in latest version
- **Ensure:** SQL starts with CREATE OR REPLACE (case insensitive)

---

## ✅ Capabilities Summary

| Feature | Supported | Notes |
|---------|-----------|-------|
| CREATE TABLE | ✅ Yes | All constraints (PK, FK, CHECK, UNIQUE, DEFAULT) |
| CREATE INDEX | ✅ Yes | All types (B-tree, GIN, GIST, HASH, partial, unique) |
| CREATE PROCEDURE | ✅ Yes | PL/pgSQL with $$ delimiters, transaction handling |
| CREATE FUNCTION | ✅ Yes | Scalar, table-returning, JSON, all attributes |
| CREATE TRIGGER | ✅ Yes | BEFORE/AFTER, all events, WHEN conditions |
| CREATE VIEW | ✅ Yes | Regular and materialized views |
| CREATE OR REPLACE | ✅ Yes | For functions, procedures, views, triggers |
| Multi-statement DDL | ✅ Yes | Sequential execution with progress tracking |
| Complex queries (CTEs) | ✅ Yes | WITH, recursive CTEs |
| Window functions | ✅ Yes | RANK, ROW_NUMBER, LAG, LEAD, etc. |
| Subqueries | ✅ Yes | In SELECT, WHERE, FROM |
| JSON functions | ✅ Yes | jsonb_agg, jsonb_build_object, etc. |
| Natural language | ✅ Yes | Powered by GitHub Copilot LLM |
| Direct SQL | ✅ Yes | Auto-detected and executed |

---

## 🎓 Best Practices

1. ✅ Use `CREATE OR REPLACE` for functions/procedures/views
2. ✅ Add constraints when creating tables (don't rely on application logic)
3. ✅ Use appropriate index types for the data (GIN for JSONB, not B-tree)
4. ✅ Include error handling in procedures (BEGIN...EXCEPTION...END)
5. ✅ Use $$ delimiters for function bodies (avoids escaping)
6. ✅ Test DDL statements incrementally (verify before moving to next)
7. ✅ Use IMMUTABLE/STABLE on functions when appropriate
8. ✅ Prefer set-based operations over loops

---

## 🎯 Quick Start

1. **Start the MCP server** (if not running)
   ```bash
   cd mcp-server
   ./venv/bin/python3 server.py
   ```

2. **Open VSCode** and open any file

3. **Open Copilot Chat** (Ctrl+I or Cmd+I)

4. **Type `@postgres` followed by your request:**
   ```
   @postgres create a table for storing blog posts
   @postgres show top 10 products by revenue
   @postgres create a function to calculate shipping cost
   ```

5. **Review the generated SQL** and confirm execution

---

## 📞 Need Help?

- 📖 Check [DDL_EXAMPLES.md](DDL_EXAMPLES.md) for detailed examples
- 📖 Check [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) for basic usage
- 📖 Check [DATABASE_DEVELOPMENT_IMPROVEMENTS.md](DATABASE_DEVELOPMENT_IMPROVEMENTS.md) for technical details
- 🌐 PostgreSQL docs: https://www.postgresql.org/docs/
- 🐛 Report issues: GitHub issues

---

**Your PostgreSQL MCP extension is now enterprise-ready for professional database development! 🚀**
