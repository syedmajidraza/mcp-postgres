-- Test File for Inline Completion with MCP Context
-- This file demonstrates how inline completions work with database schema context

-- Example 1: Creating a stored procedure
-- Type the line below and press Tab after the opening parenthesis
-- The extension will suggest parameters and function body based on your schema

CREATE OR REPLACE FUNCTION calculate_employee_bonus(

-- Example 2: Creating a table
-- Type the line below and press Tab after the opening parenthesis
-- The extension will suggest column definitions based on existing schema patterns

CREATE TABLE employee_reviews(

-- Example 3: SELECT with table suggestions
-- Type the line below and press Tab after FROM
-- The extension will suggest table names from your database

SELECT * FROM

-- Example 4: INSERT with column suggestions
-- Type the line below and press Tab after the opening parenthesis
-- The extension will suggest all columns for the employees table

INSERT INTO employees(

-- Example 5: JOIN suggestion
-- Type the line below and press Tab after JOIN
-- The extension will suggest related tables

SELECT e.*, d.department_name
FROM employees e
JOIN

-- Example 6: Creating a trigger function
-- Type the line below and press Tab
-- The extension will suggest PL/pgSQL trigger function structure

CREATE OR REPLACE FUNCTION audit_employee_changes(

-- Example 7: Creating a view
-- Type the line below and press Tab
-- The extension will suggest a SELECT statement based on your schema

CREATE OR REPLACE VIEW employee_summary AS

-- Example 8: Complex stored procedure
-- This demonstrates creating a procedure that uses multiple tables
-- The extension will suggest parameters and logic based on your schema

CREATE OR REPLACE PROCEDURE process_monthly_payroll(

-- Example 9: Creating an index
-- Type the line below and press Tab
-- The extension will suggest appropriate index definitions

CREATE INDEX idx_employees_

-- Example 10: ALTER TABLE
-- Type the line below and press Tab
-- The extension will suggest column additions based on schema patterns

ALTER TABLE employees ADD COLUMN

-- Tips:
-- 1. Wait 1-2 seconds after typing for suggestions to appear
-- 2. Press Tab to accept a suggestion
-- 3. Press Esc to dismiss a suggestion
-- 4. Ensure MCP server is running (check status bar)
-- 5. Ensure GitHub Copilot is active
