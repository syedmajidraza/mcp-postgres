# PostgreSQL MCP - Developer Quick Start

## 🚀 Get Started in 30 Seconds

1. **Open GitHub Copilot Chat** in VS Code
2. **Type** `@postgres` followed by your question
3. **See the generated SQL** and results

That's it! ✅

---

## 💡 What You Can Ask

### **Explore Data**
```
@postgres show tables
@postgres describe employees table
@postgres show me sample data from customers
```

### **Count & Aggregate**
```
@postgres how many employees are there?
@postgres what's the average salary?
@postgres total revenue this month
```

### **Query Data**
```
@postgres show employees earning over 70000
@postgres find orders from last week
@postgres get top 5 customers by spending
```

### **Create Things**
```
@postgres create a table for storing user sessions
@postgres add an index on email column
@postgres make a function to calculate tax
```

### **Modify Data**
```
@postgres add a new employee John Smith in Engineering
@postgres update salaries in sales department by 10%
@postgres delete test data
```

---

## 🎯 Examples

### Example 1: Explore Database
```
@postgres show tables
```
**Result:** List of all tables

---

### Example 2: Query Data
```
@postgres show me employees with salary greater than 70000
```
**Result:**
```
🤖 Analyzing your request and generating SQL...

Generated SQL:
SELECT * FROM employees WHERE salary > 70000

Results: 1 rows

employeeid | firstname | lastname | department  | salary
-----------|-----------|----------|-------------|--------
1          | John      | Doe      | Engineering | 75000
```

---

### Example 3: Analytics
```
@postgres what's the minimum and maximum salary?
```
**Result:**
```
Generated SQL:
SELECT MIN(salary) as min_salary, MAX(salary) as max_salary FROM employees

Results:
min_salary | max_salary
-----------|------------
60000      | 75000
```

---

### Example 4: Create Table
```
@postgres create a table for product reviews with id, product name, rating 1-5, and comment
```
**Result:**
```
Generated SQL:
CREATE TABLE product_reviews (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

✅ Statement executed: CREATE TABLE
```

---

## 🔑 Key Features

### ✅ Natural Language
Ask questions like you're talking to a person

### ✅ Shows SQL
Learn SQL by seeing what queries do what

### ✅ Schema-Aware
Knows your table and column names

### ✅ Safe
Review SQL before it executes

### ✅ Fast
No context switching, everything in VS Code

---

## 📚 Common Use Cases

### During Development
```
@postgres show me the last 10 orders
@postgres check if email already exists
@postgres count records created today
```

### Debugging
```
@postgres find duplicate entries
@postgres show records with null values
@postgres get orphaned records
```

### Database Setup
```
@postgres create users table with email and password
@postgres add timestamp columns to orders table
@postgres create index on frequently searched fields
```

---

## ⚡ Pro Tips

1. **Be specific:** "show employees in engineering" is better than "show employees"
2. **Review the SQL:** The extension shows generated SQL before executing
3. **Direct SQL works too:** Can type `SELECT * FROM employees` directly
4. **Use slash commands:** `/tables` or `/describe employees` for quick ops

---

## 🆘 Need Help?

**Extension not working?**
- Check MCP server is running (status bar shows "Running")
- Check GitHub Copilot is active (icon in status bar)

**Server not running?**
- Use command: `PostgreSQL MCP: Start Server`

**Wrong results?**
- Rephrase your question
- Or write SQL directly

---

## 🎓 Learn SQL

Every query shows the generated SQL:

```
Your question: "how many employees?"
Generated SQL: SELECT COUNT(*) FROM employees
```

**You learn SQL patterns automatically!**

---

## ✨ You're Ready!

Just type `@postgres` and ask questions. The AI will handle the rest.

**Happy querying! 🚀**
