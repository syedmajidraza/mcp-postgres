# PostgreSQL Database Development Examples

This document provides comprehensive examples of database development tasks that can be performed using the PostgreSQL MCP VSCode extension.

## Table of Contents
1. [Creating Tables](#creating-tables)
2. [Creating Indexes](#creating-indexes)
3. [Creating Stored Procedures](#creating-stored-procedures)
4. [Creating Functions](#creating-functions)
5. [Creating Triggers](#creating-triggers)
6. [Creating Views](#creating-views)
7. [Complex SQL Queries](#complex-sql-queries)
8. [Natural Language Examples](#natural-language-examples)

---

## Creating Tables

### Example 1: Basic Table with Constraints

**Natural Language:**
```
@postgres create a table for storing customer orders with order id, customer id, order date, total amount, and status
```

**Direct SQL:**
```sql
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled'))
)
```

### Example 2: Table with Foreign Keys

**Natural Language:**
```
@postgres create an order_items table with foreign keys to orders and products
```

**Direct SQL:**
```sql
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0.00 CHECK (discount >= 0 AND discount <= 100),
    UNIQUE(order_id, product_id)
)
```

### Example 3: Table with JSON Column

**Direct SQL:**
```sql
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

## Creating Indexes

### Example 1: Simple Index

**Natural Language:**
```
@postgres create an index on the email column of the users table
```

**Direct SQL:**
```sql
CREATE INDEX idx_users_email ON users(email)
```

### Example 2: Composite Index

**Direct SQL:**
```sql
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC)
```

### Example 3: Partial Index

**Direct SQL:**
```sql
CREATE INDEX idx_active_orders ON orders(order_date)
WHERE status IN ('pending', 'processing')
```

### Example 4: Unique Index

**Direct SQL:**
```sql
CREATE UNIQUE INDEX idx_users_username_unique ON users(LOWER(username))
```

### Example 5: GIN Index for JSONB

**Direct SQL:**
```sql
CREATE INDEX idx_user_preferences_settings ON user_preferences USING GIN(settings)
```

### Example 6: Full-Text Search Index

**Direct SQL:**
```sql
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || description))
```

---

## Creating Stored Procedures

### Example 1: Simple Procedure

**Natural Language:**
```
@postgres create a procedure to update order status
```

**Direct SQL:**
```sql
CREATE OR REPLACE PROCEDURE update_order_status(
    p_order_id INTEGER,
    p_new_status VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE orders
    SET status = p_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE order_id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;
END;
$$
```

### Example 2: Procedure with Transaction Handling

**Direct SQL:**
```sql
CREATE OR REPLACE PROCEDURE process_order(
    p_customer_id INTEGER,
    p_items JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id INTEGER;
    v_item JSONB;
    v_total DECIMAL(10,2) := 0;
BEGIN
    -- Create order
    INSERT INTO orders (customer_id, total_amount, status)
    VALUES (p_customer_id, 0, 'processing')
    RETURNING order_id INTO v_order_id;

    -- Process each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (
            v_order_id,
            (v_item->>'product_id')::INTEGER,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::DECIMAL
        );

        v_total := v_total + ((v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::DECIMAL);
    END LOOP;

    -- Update order total
    UPDATE orders SET total_amount = v_total WHERE order_id = v_order_id;

    COMMIT;
END;
$$
```

### Example 3: Procedure with Error Handling

**Direct SQL:**
```sql
CREATE OR REPLACE PROCEDURE archive_old_orders(p_days INTEGER DEFAULT 90)
LANGUAGE plpgsql
AS $$
DECLARE
    v_archived_count INTEGER;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;

    BEGIN
        -- Move old completed orders to archive
        WITH archived AS (
            DELETE FROM orders
            WHERE status = 'completed'
            AND order_date < v_cutoff_date
            RETURNING *
        )
        INSERT INTO orders_archive SELECT * FROM archived;

        GET DIAGNOSTICS v_archived_count = ROW_COUNT;

        RAISE NOTICE 'Archived % orders older than % days', v_archived_count, p_days;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Archive failed: %', SQLERRM;
            ROLLBACK;
    END;
END;
$$
```

---

## Creating Functions

### Example 1: Scalar Function

**Natural Language:**
```
@postgres create a function to calculate order total with tax
```

**Direct SQL:**
```sql
CREATE OR REPLACE FUNCTION calculate_order_total(
    p_order_id INTEGER,
    p_tax_rate DECIMAL DEFAULT 0.08
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_subtotal DECIMAL(10,2);
    v_total DECIMAL(10,2);
BEGIN
    SELECT SUM(quantity * unit_price * (1 - discount/100))
    INTO v_subtotal
    FROM order_items
    WHERE order_id = p_order_id;

    v_total := v_subtotal * (1 + p_tax_rate);

    RETURN ROUND(v_total, 2);
END;
$$
```

### Example 2: Table-Returning Function

**Direct SQL:**
```sql
CREATE OR REPLACE FUNCTION get_top_customers(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    customer_id INTEGER,
    customer_name VARCHAR,
    total_orders INTEGER,
    total_spent DECIMAL(10,2),
    avg_order_value DECIMAL(10,2)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.customer_id,
        c.name,
        COUNT(o.order_id)::INTEGER,
        SUM(o.total_amount)::DECIMAL(10,2),
        AVG(o.total_amount)::DECIMAL(10,2)
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    WHERE o.status = 'completed'
    GROUP BY c.customer_id, c.name
    ORDER BY SUM(o.total_amount) DESC
    LIMIT p_limit;
END;
$$
```

### Example 3: Aggregate Function

**Direct SQL:**
```sql
CREATE OR REPLACE FUNCTION product_revenue(p_product_id INTEGER)
RETURNS DECIMAL(10,2)
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE oi.product_id = p_product_id
    AND o.status = 'completed';
$$
```

### Example 4: Function with JSON Return

**Direct SQL:**
```sql
CREATE OR REPLACE FUNCTION get_order_summary(p_order_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'order_id', o.order_id,
        'customer', jsonb_build_object(
            'id', c.customer_id,
            'name', c.name,
            'email', c.email
        ),
        'order_date', o.order_date,
        'status', o.status,
        'items', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'product_name', p.name,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'total', oi.quantity * oi.unit_price
                )
            )
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = o.order_id
        ),
        'total_amount', o.total_amount
    )
    INTO v_result
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    WHERE o.order_id = p_order_id;

    RETURN v_result;
END;
$$
```

---

## Creating Triggers

### Example 1: Audit Trigger

**Direct SQL:**
```sql
-- First create the trigger function
CREATE OR REPLACE FUNCTION audit_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO order_audit (order_id, changed_by, old_status, new_status, changed_at)
        VALUES (NEW.order_id, current_user, OLD.status, NEW.status, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$;

-- Then create the trigger
CREATE TRIGGER trg_audit_orders
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION audit_order_changes()
```

### Example 2: Timestamp Trigger

**Direct SQL:**
```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_orders_timestamp
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_timestamp()
```

### Example 3: Validation Trigger

**Direct SQL:**
```sql
CREATE OR REPLACE FUNCTION validate_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_calculated_total DECIMAL(10,2);
BEGIN
    SELECT SUM(quantity * unit_price)
    INTO v_calculated_total
    FROM order_items
    WHERE order_id = NEW.order_id;

    IF ABS(NEW.total_amount - COALESCE(v_calculated_total, 0)) > 0.01 THEN
        RAISE EXCEPTION 'Order total mismatch: expected %, got %', v_calculated_total, NEW.total_amount;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_total
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_total()
```

---

## Creating Views

### Example 1: Simple View

**Natural Language:**
```
@postgres create a view showing active orders with customer details
```

**Direct SQL:**
```sql
CREATE OR REPLACE VIEW active_orders AS
SELECT
    o.order_id,
    o.order_date,
    c.name AS customer_name,
    c.email AS customer_email,
    o.total_amount,
    o.status
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.status IN ('pending', 'processing')
ORDER BY o.order_date DESC
```

### Example 2: Materialized View

**Direct SQL:**
```sql
CREATE MATERIALIZED VIEW monthly_sales_summary AS
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS avg_order_value,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM orders
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month DESC;

-- Create index on materialized view
CREATE INDEX idx_monthly_sales_month ON monthly_sales_summary(month)
```

### Example 3: Complex Reporting View

**Direct SQL:**
```sql
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
    c.customer_id,
    c.name,
    c.email,
    c.join_date,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(o.total_amount) AS lifetime_value,
    AVG(o.total_amount) AS avg_order_value,
    MAX(o.order_date) AS last_order_date,
    CASE
        WHEN MAX(o.order_date) > CURRENT_DATE - INTERVAL '30 days' THEN 'Active'
        WHEN MAX(o.order_date) > CURRENT_DATE - INTERVAL '90 days' THEN 'At Risk'
        ELSE 'Inactive'
    END AS customer_status
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.status = 'completed'
GROUP BY c.customer_id, c.name, c.email, c.join_date
```

---

## Complex SQL Queries

### Example 1: Common Table Expressions (CTEs)

**Natural Language:**
```
@postgres show customers who spent more than average this year
```

**Direct SQL:**
```sql
WITH avg_spending AS (
    SELECT AVG(total_amount) AS avg_amount
    FROM orders
    WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND status = 'completed'
),
customer_spending AS (
    SELECT
        c.customer_id,
        c.name,
        SUM(o.total_amount) AS total_spent
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    WHERE EXTRACT(YEAR FROM o.order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND o.status = 'completed'
    GROUP BY c.customer_id, c.name
)
SELECT
    cs.customer_id,
    cs.name,
    cs.total_spent,
    ROUND((cs.total_spent / avg_s.avg_amount - 1) * 100, 2) AS percent_above_avg
FROM customer_spending cs
CROSS JOIN avg_spending avg_s
WHERE cs.total_spent > avg_s.avg_amount
ORDER BY cs.total_spent DESC
```

### Example 2: Window Functions

**Natural Language:**
```
@postgres rank products by revenue within each category
```

**Direct SQL:**
```sql
SELECT
    p.product_id,
    p.name,
    p.category,
    SUM(oi.quantity * oi.unit_price) AS revenue,
    RANK() OVER (PARTITION BY p.category ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS category_rank,
    DENSE_RANK() OVER (ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS overall_rank,
    ROUND(
        100.0 * SUM(oi.quantity * oi.unit_price) /
        SUM(SUM(oi.quantity * oi.unit_price)) OVER (PARTITION BY p.category),
        2
    ) AS category_revenue_pct
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY p.product_id, p.name, p.category
ORDER BY p.category, category_rank
```

### Example 3: Recursive CTE

**Direct SQL:**
```sql
WITH RECURSIVE employee_hierarchy AS (
    -- Base case: top-level managers
    SELECT
        employee_id,
        name,
        manager_id,
        1 AS level,
        name::TEXT AS hierarchy_path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive case: employees with managers
    SELECT
        e.employee_id,
        e.name,
        e.manager_id,
        eh.level + 1,
        eh.hierarchy_path || ' > ' || e.name
    FROM employees e
    JOIN employee_hierarchy eh ON e.manager_id = eh.employee_id
)
SELECT
    employee_id,
    REPEAT('  ', level - 1) || name AS indented_name,
    level,
    hierarchy_path
FROM employee_hierarchy
ORDER BY hierarchy_path
```

### Example 4: Advanced JOIN with Aggregation

**Direct SQL:**
```sql
SELECT
    c.name AS customer_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COUNT(DISTINCT oi.product_id) AS unique_products_purchased,
    ARRAY_AGG(DISTINCT p.category) AS categories_purchased,
    SUM(oi.quantity * oi.unit_price) AS total_spent,
    MAX(o.order_date) AS last_order_date,
    ROUND(
        SUM(oi.quantity * oi.unit_price) / NULLIF(COUNT(DISTINCT o.order_id), 0),
        2
    ) AS avg_order_value
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.status = 'completed'
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.product_id
GROUP BY c.customer_id, c.name
HAVING COUNT(DISTINCT o.order_id) > 0
ORDER BY total_spent DESC
LIMIT 50
```

### Example 5: Subquery in SELECT

**Direct SQL:**
```sql
SELECT
    p.product_id,
    p.name,
    p.price,
    (
        SELECT COUNT(*)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE oi.product_id = p.product_id
        AND o.order_date > CURRENT_DATE - INTERVAL '30 days'
    ) AS orders_last_30_days,
    (
        SELECT COALESCE(SUM(oi.quantity), 0)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE oi.product_id = p.product_id
        AND o.status = 'completed'
    ) AS total_units_sold,
    (
        SELECT AVG(review_rating)
        FROM product_reviews pr
        WHERE pr.product_id = p.product_id
    ) AS avg_rating
FROM products p
WHERE p.active = true
ORDER BY orders_last_30_days DESC
```

---

## Natural Language Examples

### Querying Data

```
@postgres show me all employees earning more than 70000
@postgres find the top 10 highest paid employees
@postgres how many orders were placed this month
@postgres what's the average salary by department
@postgres list all customers who haven't placed an order in the last 60 days
@postgres show products with low inventory (less than 10 units)
@postgres calculate total revenue by category for this year
```

### Creating Objects

```
@postgres create a customers table with id, name, email, and phone
@postgres create an index on the email column for faster lookups
@postgres create a function to calculate customer lifetime value
@postgres create a procedure to process monthly invoices
@postgres create a view showing high-value customers
@postgres create a trigger to log all changes to the orders table
```

### Modifying Data

```
@postgres update all products in category 'Electronics' with a 10% discount
@postgres delete orders older than 2 years with status 'cancelled'
@postgres insert a new customer with name 'John Doe' and email 'john@example.com'
```

### Analysis Queries

```
@postgres compare sales between this month and last month
@postgres find customers with declining order frequency
@postgres show inventory turnover rate by product
@postgres analyze order patterns by day of week
@postgres identify products frequently bought together
```

---

## Best Practices

1. **Use `CREATE OR REPLACE`** for functions, procedures, and views to avoid errors when re-running scripts
2. **Add constraints** (PRIMARY KEY, FOREIGN KEY, CHECK, NOT NULL) when creating tables
3. **Use appropriate indexes** for columns frequently used in WHERE, JOIN, and ORDER BY clauses
4. **Include error handling** in stored procedures with BEGIN...EXCEPTION...END blocks
5. **Use $$ delimiters** for function/procedure bodies to avoid escaping issues
6. **Add comments** to document complex logic: `COMMENT ON FUNCTION func_name IS 'description'`
7. **Test procedures/functions** individually before integrating into applications
8. **Use transactions** in procedures that modify multiple tables
9. **Prefer set-based operations** over loops for better performance
10. **Use STABLE/IMMUTABLE** function attributes appropriately for query optimization

---

## Troubleshooting

### Common Issues

**Issue: CREATE OR REPLACE not detected**
- Make sure the SQL starts with `CREATE OR REPLACE` (now fixed in latest version)

**Issue: Multi-statement SQL fails**
- For functions/procedures with $$, use them as single statements
- For multiple separate DDL statements, they will be executed sequentially

**Issue: Syntax errors in functions**
- Verify $$ delimiters match
- Check parameter types and RETURNS clause
- Ensure LANGUAGE plpgsql is specified

**Issue: Foreign key constraints fail**
- Ensure referenced table and column exist
- Verify data types match between FK and PK columns
- Check if referenced column has a unique or primary key constraint

---

## Additional Resources

- PostgreSQL Official Documentation: https://www.postgresql.org/docs/
- PL/pgSQL Guide: https://www.postgresql.org/docs/current/plpgsql.html
- Index Types: https://www.postgresql.org/docs/current/indexes-types.html
- Window Functions: https://www.postgresql.org/docs/current/tutorial-window.html
