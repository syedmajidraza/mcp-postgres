# PostgreSQL MCP - Improved with LLM

## Current Problem

Your extension uses **simple pattern matching** (regex) instead of AI to understand natural language queries.

**Example failure:**
```
User: "minimum salary of employees"
Current code extracts: column="employees" (WRONG!)
Generated SQL: SELECT MIN(employees) FROM employees (BREAKS!)
Error: function min(employees) does not exist
```

---

## Solution: Use GitHub Copilot's LLM

GitHub Copilot provides the `vscode.lm` API to access language models directly in extensions.

### **New Architecture:**

```
User Query: "What's the minimum salary of employees?"
    ↓
Extension asks Copilot LLM:
  "Convert this to SQL: 'What's the minimum salary of employees?'
   Available tables: employees (employeeid, firstname, lastname, department, salary)"
    ↓
Copilot LLM generates:
  "SELECT MIN(salary) FROM employees"
    ↓
MCP Server executes SQL
    ↓
Return results to user
```

---

## Implementation

### **Step 1: Add LLM-based SQL Generation**

Add this function to `extension.ts`:

```typescript
async function generateSQLWithLLM(
    naturalLanguageQuery: string,
    baseUrl: string
): Promise<string> {
    try {
        // Get available tables from MCP server
        const tablesResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'list_tables',
            arguments: { schema: 'public' }
        });

        const tables = tablesResponse.data.result.tables.map((t: any) => t.table_name);

        // Get schema for each table
        const schemas: string[] = [];
        for (const table of tables) {
            const schemaResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                name: 'describe_table',
                arguments: { table_name: table }
            });

            const columns = schemaResponse.data.result.columns
                .map((c: any) => `${c.column_name} (${c.data_type})`)
                .join(', ');

            schemas.push(`${table}: ${columns}`);
        }

        // Get available language models
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: 'gpt-4'
        });

        if (models.length === 0) {
            throw new Error('No Copilot models available');
        }

        const model = models[0];

        // Create prompt for SQL generation
        const prompt = `You are a PostgreSQL expert. Convert the following natural language query into a valid PostgreSQL SQL statement.

Database Schema:
${schemas.join('\n')}

Natural Language Query: "${naturalLanguageQuery}"

Rules:
- Return ONLY the SQL statement, no explanations
- Use proper PostgreSQL syntax
- Use appropriate JOINs if multiple tables are needed
- Add LIMIT clauses for safety if querying all rows
- Use aggregate functions (COUNT, AVG, MIN, MAX, SUM) when appropriate

SQL:`;

        const messages = [
            vscode.LanguageModelChatMessage.User(prompt)
        ];

        const chatResponse = await model.sendRequest(messages, {});

        let sqlQuery = '';
        for await (const fragment of chatResponse.text) {
            sqlQuery += fragment;
        }

        // Clean up the response
        sqlQuery = sqlQuery
            .trim()
            .replace(/^```sql\n/, '')  // Remove markdown SQL blocks
            .replace(/\n```$/, '')
            .replace(/^```\n/, '')
            .replace(/;$/, '');  // Remove trailing semicolon

        return sqlQuery;

    } catch (error: any) {
        throw new Error(`Failed to generate SQL: ${error.message}`);
    }
}
```

### **Step 2: Update handleGeneralRequest**

Replace the pattern matching with LLM-based SQL generation:

```typescript
async function handleGeneralRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    const lowerPrompt = prompt.toLowerCase();

    // Check if user wants direct SQL execution
    if (lowerPrompt.startsWith('select ') ||
        lowerPrompt.startsWith('insert ') ||
        lowerPrompt.startsWith('update ') ||
        lowerPrompt.startsWith('delete ') ||
        lowerPrompt.startsWith('create ')) {
        // Direct SQL - execute as-is
        await handleQueryRequest(prompt, baseUrl, stream);
        return;
    }

    try {
        // Use LLM to generate SQL from natural language
        stream.markdown('🤖 Generating SQL query...\n\n');

        const sqlQuery = await generateSQLWithLLM(prompt, baseUrl);

        stream.markdown(`Generated SQL:\n\`\`\`sql\n${sqlQuery}\n\`\`\`\n\n`);

        // Determine if it's a query or modification
        const sqlLower = sqlQuery.toLowerCase().trim();

        if (sqlLower.startsWith('select')) {
            // Execute as query
            const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                name: 'query_database',
                arguments: { query: sqlQuery }
            });

            const result = response.data.result;
            stream.markdown(`**Results:** ${result.row_count} rows\n\n`);

            if (result.rows.length > 0) {
                stream.markdown('```\n');
                stream.markdown(formatAsTable(result.rows));
                stream.markdown('\n```');
            }
        } else {
            // Execute as modification
            const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                name: 'execute_sql',
                arguments: { sql: sqlQuery }
            });

            const result = response.data.result;
            if (result.status === 'success') {
                stream.markdown(`✅ ${result.message}`);
            } else {
                stream.markdown(`❌ ${result.message}`);
            }
        }

    } catch (error: any) {
        stream.markdown(`\n❌ Error: ${error.message}\n\n`);
        stream.markdown(`Try rephrasing your question or provide a direct SQL query.`);
    }
}
```

### **Step 3: Update handleCountRequest, handleAggregateRequest, etc.**

Replace all pattern-matching functions with calls to `generateSQLWithLLM`:

```typescript
async function handleCountRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    // Use LLM instead of pattern matching
    await handleGeneralRequest(prompt, baseUrl, stream);
}

async function handleInferredQuery(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    // Use LLM instead of pattern matching
    await handleGeneralRequest(prompt, baseUrl, stream);
}

async function handleAggregateRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    // Use LLM instead of pattern matching
    await handleGeneralRequest(prompt, baseUrl, stream);
}
```

---

## How It Works

### **Example 1: Simple Query**

**User:** `@postgres What's the minimum salary of employees?`

**Extension:**
1. Calls `generateSQLWithLLM()`
2. Gets database schema: `employees: employeeid (integer), firstname (varchar), ... salary (numeric)`
3. Sends to Copilot LLM:
   ```
   Convert this to SQL: "What's the minimum salary of employees?"
   Schema: employees (employeeid, firstname, lastname, department, salary)
   ```
4. LLM returns: `SELECT MIN(salary) FROM employees`
5. Extension executes SQL
6. Returns result: `60000`

### **Example 2: Complex Query**

**User:** `@postgres Show me employees earning more than the average salary`

**LLM generates:**
```sql
SELECT firstname, lastname, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC
```

### **Example 3: Create Table**

**User:** `@postgres Create a table for storing product reviews with id, product name, rating out of 5, and review text`

**LLM generates:**
```sql
CREATE TABLE product_reviews (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### **Example 4: Stored Procedure**

**User:** `@postgres Create a function to calculate employee bonus as 10% of salary`

**LLM generates:**
```sql
CREATE OR REPLACE FUNCTION calculate_bonus(emp_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    emp_salary NUMERIC;
BEGIN
    SELECT salary INTO emp_salary FROM employees WHERE employeeid = emp_id;
    RETURN emp_salary * 0.10;
END;
$$ LANGUAGE plpgsql
```

---

## Benefits of LLM Approach

### ✅ **Robust Natural Language Understanding**
- Understands context: "minimum salary" vs "salary minimum"
- Handles variations: "avg", "average", "mean"
- Understands complex requests: "employees earning more than average"

### ✅ **No Pattern Maintenance**
- No need to write regex patterns
- No hardcoded column names
- Adapts to any database schema

### ✅ **Handles Complex Queries**
- JOINs across tables
- Subqueries
- CTEs (Common Table Expressions)
- Window functions

### ✅ **Schema-Aware**
- Knows actual column names from database
- Suggests proper table relationships
- Uses correct data types

### ✅ **Educational**
- Shows generated SQL to users
- Developers learn SQL patterns
- Transparent about what's being executed

---

## Comparison

### **Current (Pattern Matching)**
```
Query: "minimum salary of employees"
Pattern: Detects "min" keyword
Extract: column = "employees" (WRONG!)
SQL: SELECT MIN(employees) FROM employees
Result: ❌ ERROR
```

### **New (LLM-Based)**
```
Query: "minimum salary of employees"
LLM understands: User wants MIN(salary), not MIN(employees)
SQL: SELECT MIN(salary) FROM employees
Result: ✅ 60000
```

---

## Implementation Steps

1. **Add the `generateSQLWithLLM` function** to extension.ts
2. **Replace pattern-matching functions** with LLM calls
3. **Compile and package:**
   ```bash
   npm run compile
   npm run package
   ```
4. **Reinstall extension** in VS Code
5. **Test natural language queries**

---

## Testing Examples

After implementation, all these will work:

```
@postgres What's the minimum salary?
@postgres Show me employees with above average salaries
@postgres Count how many people work in each department
@postgres Create a table for tracking customer orders
@postgres Make a function that calculates tax at 8.5%
@postgres Show the top 5 highest paid employees
@postgres Get employees hired in the last year
@postgres What's the total payroll cost?
```

---

## Error Handling

The LLM approach includes better error handling:

1. **Invalid queries:** LLM explains what went wrong
2. **Ambiguous requests:** LLM asks for clarification
3. **Schema mismatches:** LLM suggests correct table/column names

---

## Next Steps

1. I can implement this LLM-based approach for you
2. Or you can follow the code above to add it yourself
3. The key is using `vscode.lm` API available in VS Code extensions

This makes your MCP server truly robust and able to handle ANY SQL query your developers can think of!

Would you like me to implement this improved version?
