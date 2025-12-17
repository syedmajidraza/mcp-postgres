# PostgreSQL MCP Examples

Practical examples of using PostgreSQL MCP with GitHub Copilot.

## Table of Contents

- [Basic Queries](#basic-queries)
- [Table Operations](#table-operations)
- [Data Manipulation](#data-manipulation)
- [Creating Objects](#creating-objects)
- [Performance Analysis](#performance-analysis)
- [Advanced Examples](#advanced-examples)

## Basic Queries

### List All Tables

```
@postgres List all tables in the database
```

**Alternative commands:**
```
@postgres /tables
@postgres Show me all tables
@postgres What tables exist?
```

### Query Specific Table

```
@postgres SELECT * FROM customers LIMIT 10
```

```
@postgres Show me all products
```

```
@postgres Query the orders table
```

### Filter Data

```
@postgres Show me all users where status = 'active'
```

```
@postgres Find all orders from the last 30 days
```

```
@postgres Get customers from California
```

### Aggregate Queries

```
@postgres Count total number of orders
```

```
@postgres Sum of all order amounts
```

```
@postgres Average product price
```

## Table Operations

### Describe Table Structure

```
@postgres Describe the customers table
```

```
@postgres /describe employees
```

```
@postgres Show me the structure of the products table
```

### Show Indexes

```
@postgres Show indexes on the orders table
```

```
@postgres What indexes exist on customers?
```

### Table Information

```
@postgres How many columns does the users table have?
```

```
@postgres Show column types for the products table
```

## Data Manipulation

### Insert Data

```
@postgres INSERT INTO customers (name, email) VALUES ('John Doe', 'john@example.com')
```

```
@postgres Add a new product: name='Laptop', price=999.99
```

### Update Data

```
@postgres UPDATE customers SET status = 'inactive' WHERE id = 5
```

```
@postgres Change the price of product_id 10 to 49.99
```

### Delete Data

```
@postgres DELETE FROM old_orders WHERE created_at < '2023-01-01'
```

```
@postgres Remove customer with id 123
```

## Creating Objects

### Create Table

```
@postgres Create a table called employees with the following columns:
- id (primary key)
- name (varchar 255)
- email (varchar 255, unique)
- department (varchar 100)
- salary (decimal)
- hire_date (date)
```

**More examples:**

```
@postgres Create a products table with id, name, description, price, and stock_quantity
```

```
@postgres Make a users table with authentication fields
```

### Create Table with Constraints

```
@postgres Create table 'orders' with:
- order_id (serial primary key)
- customer_id (integer, foreign key to customers)
- order_date (timestamp, default now)
- total_amount (decimal not null)
- status (varchar 50, default 'pending')
```

### Create Stored Procedure

```
@postgres Create a stored procedure called get_total_sales that returns the sum of all order amounts
```

```
@postgres Create a function to calculate customer lifetime value
```

### Create Function with Parameters

```
@postgres Create a stored procedure:
Name: get_orders_by_status
Parameters: status_name VARCHAR
Returns: Table of orders
Logic: SELECT * FROM orders WHERE status = status_name
```

### Create Index

```
@postgres CREATE INDEX idx_customers_email ON customers(email)
```

```
@postgres Add an index on the created_at column of the orders table
```

## Performance Analysis

### Explain Query Plan

```
@postgres Explain the query plan for SELECT * FROM orders WHERE customer_id = 100
```

```
@postgres Analyze performance of: SELECT * FROM large_table WHERE status = 'active'
```

### Identify Slow Queries

```
@postgres What would be the execution plan for joining orders and customers?
```

```
@postgres Show me the query plan for this complex query: [your query]
```

## Advanced Examples

### Complex Joins

```
@postgres SELECT c.name, COUNT(o.id) as order_count
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.name
ORDER BY order_count DESC
```

```
@postgres Show me all customers with their total order amounts
```

### Subqueries

```
@postgres Find all products with price higher than the average
```

```
@postgres Show customers who have placed more than 5 orders
```

### Window Functions

```
@postgres SELECT name, salary,
RANK() OVER (ORDER BY salary DESC) as salary_rank
FROM employees
```

```
@postgres Show running total of sales by date
```

### CTEs (Common Table Expressions)

```
@postgres WITH high_value_customers AS (
  SELECT customer_id, SUM(total) as lifetime_value
  FROM orders
  GROUP BY customer_id
  HAVING SUM(total) > 1000
)
SELECT c.name, hvc.lifetime_value
FROM customers c
JOIN high_value_customers hvc ON c.id = hvc.customer_id
```

### Date Operations

```
@postgres Show orders from last week
```

```
@postgres Get monthly sales for 2024
```

```
@postgres Find users who signed up this year
```

### JSON Operations (PostgreSQL)

```
@postgres SELECT data->>'name' FROM json_table WHERE data->>'status' = 'active'
```

```
@postgres Query JSON column in products table
```

## Database Administration

### Database Schema Information

```
@postgres Show me all tables in the 'public' schema
```

```
@postgres List all stored procedures
```

```
@postgres Show all views in the database
```

### Table Statistics

```
@postgres How many rows are in the customers table?
```

```
@postgres Show table sizes
```

### User Permissions

```
@postgres GRANT SELECT ON customers TO readonly_user
```

## Data Import/Export Examples

### Bulk Insert

```
@postgres INSERT INTO products (name, price) VALUES
('Product 1', 19.99),
('Product 2', 29.99),
('Product 3', 39.99)
```

### Copy Data Between Tables

```
@postgres INSERT INTO archive_orders SELECT * FROM orders WHERE created_at < '2023-01-01'
```

## Practical Use Cases

### E-commerce

**Get best-selling products:**
```
@postgres SELECT p.name, COUNT(oi.id) as times_ordered
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.name
ORDER BY times_ordered DESC
LIMIT 10
```

**Find abandoned carts:**
```
@postgres SELECT * FROM carts
WHERE status = 'abandoned'
AND updated_at < NOW() - INTERVAL '24 hours'
```

### Analytics

**User engagement metrics:**
```
@postgres SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as daily_active_users
FROM user_activities
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date
```

**Cohort analysis:**
```
@postgres SELECT
  DATE_TRUNC('month', signup_date) as cohort_month,
  COUNT(*) as user_count
FROM users
GROUP BY cohort_month
ORDER BY cohort_month
```

### Reporting

**Sales report:**
```
@postgres SELECT
  DATE(order_date) as date,
  COUNT(*) as order_count,
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_order_value
FROM orders
WHERE order_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(order_date)
ORDER BY date
```

**Customer lifetime value:**
```
@postgres SELECT
  c.id,
  c.name,
  COUNT(o.id) as total_orders,
  SUM(o.total_amount) as lifetime_value,
  AVG(o.total_amount) as avg_order_value
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name
HAVING COUNT(o.id) > 0
ORDER BY lifetime_value DESC
```

## Troubleshooting Queries

### Find Duplicate Records

```
@postgres Find duplicate emails in customers table
```

```
@postgres SELECT email, COUNT(*)
FROM customers
GROUP BY email
HAVING COUNT(*) > 1
```

### Find Missing Foreign Keys

```
@postgres SELECT * FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM customers c WHERE c.id = o.customer_id
)
```

### Data Quality Checks

```
@postgres Find customers with invalid email formats
```

```
@postgres Show products with negative prices
```

```
@postgres Find orders with null customer_id
```

## Migration Examples

### Alter Table

```
@postgres ALTER TABLE customers ADD COLUMN phone VARCHAR(20)
```

```
@postgres Add a created_at timestamp column to users table
```

### Rename Column

```
@postgres ALTER TABLE products RENAME COLUMN desc TO description
```

### Modify Column Type

```
@postgres ALTER TABLE orders ALTER COLUMN total_amount TYPE DECIMAL(12,2)
```

### Drop Column

```
@postgres ALTER TABLE users DROP COLUMN old_field
```

## Tips for Better Results

### 1. Be Specific

Good:
```
@postgres Show me customers who placed orders in January 2024
```

Less specific:
```
@postgres Show customers
```

### 2. Use SQL Directly for Complex Queries

```
@postgres SELECT
  c.name,
  o.order_date,
  SUM(oi.quantity * oi.price) as total
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.order_date >= '2024-01-01'
GROUP BY c.name, o.order_date
```

### 3. Ask for Explanations

```
@postgres Explain what this index does: idx_orders_customer_id
```

### 4. Request Analysis

```
@postgres Should I add an index to the email column in customers table?
```

### 5. Combine Operations

```
@postgres Create a users table, add an index on email, and insert a test user
```

## Error Handling Examples

### Check if Table Exists Before Creating

```
@postgres CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255)
)
```

### Safe Updates

```
@postgres BEGIN;
UPDATE products SET price = price * 1.1 WHERE category = 'electronics';
-- Check results first
SELECT * FROM products WHERE category = 'electronics';
-- ROLLBACK; if needed
COMMIT;
```

## Testing Examples

### Create Test Data

```
@postgres INSERT INTO test_users (name, email)
SELECT
  'User ' || generate_series,
  'user' || generate_series || '@test.com'
FROM generate_series(1, 100)
```

### Sample Data

```
@postgres Create sample data for testing the orders table
```

## Performance Optimization Examples

### Add Index for Slow Query

```
@postgres The query SELECT * FROM orders WHERE customer_id = 123 is slow. Create an appropriate index.
```

Response:
```sql
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

### Analyze Table Statistics

```
@postgres ANALYZE customers;
```

### Vacuum Table

```
@postgres VACUUM ANALYZE orders;
```

## Best Practices

1. **Use LIMIT** for large tables
2. **Add indexes** for frequently queried columns
3. **Use transactions** for multiple related operations
4. **Check query plans** for slow queries
5. **Validate data** before deleting or updating
6. **Use constraints** to maintain data integrity
7. **Regular backups** before major changes

## Conclusion

These examples demonstrate the versatility of PostgreSQL MCP. Experiment with different queries and commands to discover what works best for your workflow!

For more information:
- Check [README.md](README.md) for setup
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- See [mcp-server/README.md](mcp-server/README.md) for API reference
