import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import * as http from 'http';
import { AIProviderManager } from './providers/ai-provider';

let mcpServerProcess: ChildProcess | null = null;
let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let copilotProxyServer: http.Server | null = null;
let aiProviderManager: AIProviderManager;

// Cache for database schema to improve inline completion performance
interface SchemaCache {
    tables: string[];
    tableSchemas: Map<string, any[]>;
    functions: string[];
    lastUpdated: number;
}

let schemaCache: SchemaCache = {
    tables: [],
    tableSchemas: new Map(),
    functions: [],
    lastUpdated: 0
};

export function activate(context: vscode.ExtensionContext) {
    console.log('PostgreSQL MCP extension is now active');

    // Create output channel
    outputChannel = vscode.window.createOutputChannel('PostgreSQL MCP');
    context.subscriptions.push(outputChannel);

    // Initialize AI provider manager
    aiProviderManager = new AIProviderManager(outputChannel);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'postgres-mcp.showStatus';
    context.subscriptions.push(statusBarItem);
    updateStatusBar('stopped');

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('postgres-mcp.startServer', () => startMcpServer(context)),
        vscode.commands.registerCommand('postgres-mcp.stopServer', stopMcpServer),
        vscode.commands.registerCommand('postgres-mcp.restartServer', () => restartMcpServer(context)),
        vscode.commands.registerCommand('postgres-mcp.configure', configureDatabase),
        vscode.commands.registerCommand('postgres-mcp.showStatus', showServerStatus),
        vscode.commands.registerCommand('postgres-mcp.selectAIProvider', selectAIProvider)
    );

    // Register chat participant
    const participant = vscode.chat.createChatParticipant('postgres-mcp.chatParticipant', handleChatRequest);
    participant.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'resources', 'postgres-icon.png'));
    context.subscriptions.push(participant);

    // Register inline completion provider for SQL files
    const inlineCompletionProvider = vscode.languages.registerInlineCompletionItemProvider(
        [
            { language: 'sql', scheme: 'file' },
            { language: 'plsql', scheme: 'file' },
            { language: 'postgres', scheme: 'file' },
            { pattern: '**/*.sql' }
        ],
        new PostgreSQLInlineCompletionProvider()
    );
    context.subscriptions.push(inlineCompletionProvider);

    // Auto-start server if configured
    const config = vscode.workspace.getConfiguration('postgresMcp');
    if (config.get('server.autoStart')) {
        startMcpServer(context);
    }

    // Start Copilot API proxy server for web chatbot
    startCopilotProxyServer();

    // Initialize schema cache on startup
    setTimeout(() => refreshSchemaCache(), 5000);
}

// Copilot API Proxy Server for Web Chatbot
function startCopilotProxyServer() {
    const PROXY_PORT = 9000;

    copilotProxyServer = http.createServer(async (req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === 'POST' && req.url === '/copilot/generate') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { query, schema } = JSON.parse(body);

                    // Get AI model from configured provider
                    let model: vscode.LanguageModelChat;
                    try {
                        model = await aiProviderManager.getModel();
                    } catch (error) {
                        res.writeHead(503);
                        res.end(JSON.stringify({ error: `AI provider not available: ${error}` }));
                        return;
                    }

                    // Create prompt for SQL generation
                    const systemPrompt = `You are a PostgreSQL expert assistant. Convert natural language queries into valid PostgreSQL SQL statements.

**Available Database Schema:**
${schema || 'No schema provided'}

**Instructions:**
- Return ONLY the SQL statement, no explanations or markdown
- Use proper PostgreSQL syntax
- For queries returning data, use SELECT
- For data modification, use INSERT, UPDATE, DELETE
- For schema changes, use CREATE, ALTER, DROP
- Add appropriate JOINs if multiple tables are needed
- Add LIMIT clauses for safety when selecting large datasets
- Use aggregate functions (COUNT, AVG, MIN, MAX, SUM) when appropriate

**DDL Requirements:**
- For CREATE TABLE: Include appropriate data types, PRIMARY KEY, FOREIGN KEY, and constraints
- For CREATE INDEX: Use appropriate index types
- For stored procedures/functions: Use CREATE OR REPLACE with proper PL/pgSQL syntax
- For triggers: Include timing and events
- For views: Use CREATE OR REPLACE VIEW

**Complex Query Support:**
- Use CTEs (WITH clause) for complex multi-step queries
- Use window functions when appropriate
- Use subqueries and correlated subqueries when needed

**User Request:** ${query}

**SQL:**`;

                    const messages = [vscode.LanguageModelChatMessage.User(systemPrompt)];
                    const chatResponse = await model.sendRequest(messages, {});

                    let sqlQuery = '';
                    for await (const fragment of chatResponse.text) {
                        sqlQuery += fragment;
                    }

                    // Clean up the response
                    sqlQuery = sqlQuery
                        .trim()
                        .replace(/^```sql\s*/i, '')
                        .replace(/^```\s*/i, '')
                        .replace(/\s*```$/i, '')
                        .replace(/;+$/g, ';')
                        .trim();

                    if (sqlQuery.endsWith(';')) {
                        sqlQuery = sqlQuery.slice(0, -1);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ sql: sqlQuery }));

                } catch (error: any) {
                    outputChannel.appendLine(`[Copilot Proxy Error]: ${error.message}`);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'running', service: 'copilot-proxy' }));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    });

    copilotProxyServer.listen(PROXY_PORT, () => {
        outputChannel.appendLine(`Copilot API Proxy running on port ${PROXY_PORT}`);
        vscode.window.showInformationMessage(`Copilot API Proxy started on port ${PROXY_PORT}`);
    });
}

async function startMcpServer(context: vscode.ExtensionContext) {
    if (mcpServerProcess) {
        vscode.window.showWarningMessage('PostgreSQL MCP server is already running');
        return;
    }

    const config = vscode.workspace.getConfiguration('postgresMcp');

    // Find the MCP server directory
    const serverPath = findMcpServerPath(context);
    if (!serverPath) {
        vscode.window.showErrorMessage('MCP server not found. Please install the server first.');
        return;
    }

    const pythonPath = config.get('pythonPath', 'python3');
    const serverPort = config.get('server.port', 3000);

    outputChannel.appendLine('Starting PostgreSQL MCP server...');
    outputChannel.appendLine(`Server path: ${serverPath}`);
    outputChannel.appendLine(`Python path: ${pythonPath}`);
    outputChannel.show();

    // Set environment variables for the server
    const env = {
        ...process.env,
        DB_HOST: config.get('database.host', 'localhost'),
        DB_PORT: String(config.get('database.port', 5431)),
        DB_NAME: config.get('database.name', 'AdventureWorks'),
        DB_USER: config.get('database.user', 'postgres'),
        DB_PASSWORD: config.get('database.password', ''),
        SERVER_PORT: String(serverPort)
    };

    try {
        // Start the FastAPI server
        mcpServerProcess = spawn(pythonPath, ['-m', 'uvicorn', 'server:app', '--host', '127.0.0.1', '--port', String(serverPort)], {
            cwd: serverPath,
            env: env
        });

        mcpServerProcess.stdout?.on('data', (data) => {
            outputChannel.appendLine(`[SERVER] ${data.toString()}`);
        });

        mcpServerProcess.stderr?.on('data', (data) => {
            outputChannel.appendLine(`[ERROR] ${data.toString()}`);
        });

        mcpServerProcess.on('exit', (code) => {
            outputChannel.appendLine(`Server exited with code ${code}`);
            mcpServerProcess = null;
            updateStatusBar('stopped');
            vscode.window.showWarningMessage('PostgreSQL MCP server stopped');
        });

        // Wait a bit and check if server is running
        setTimeout(async () => {
            const isRunning = await checkServerHealth(serverPort);
            if (isRunning) {
                updateStatusBar('running');
                vscode.window.showInformationMessage('PostgreSQL MCP server started successfully');
            } else {
                updateStatusBar('error');
                vscode.window.showErrorMessage('Failed to start MCP server. Check output for details.');
            }
        }, 3000);

    } catch (error) {
        outputChannel.appendLine(`Error starting server: ${error}`);
        vscode.window.showErrorMessage(`Failed to start MCP server: ${error}`);
        updateStatusBar('error');
    }
}

function stopMcpServer() {
    if (!mcpServerProcess) {
        vscode.window.showWarningMessage('PostgreSQL MCP server is not running');
        return;
    }

    outputChannel.appendLine('Stopping PostgreSQL MCP server...');
    mcpServerProcess.kill();
    mcpServerProcess = null;
    updateStatusBar('stopped');
    vscode.window.showInformationMessage('PostgreSQL MCP server stopped');
}

async function restartMcpServer(context: vscode.ExtensionContext) {
    stopMcpServer();
    setTimeout(() => startMcpServer(context), 1000);
}

async function configureDatabase() {
    const config = vscode.workspace.getConfiguration('postgresMcp');

    const host = await vscode.window.showInputBox({
        prompt: 'Database Host',
        value: config.get('database.host', 'localhost')
    });

    if (!host) return;

    const port = await vscode.window.showInputBox({
        prompt: 'Database Port',
        value: String(config.get('database.port', 5431))
    });

    if (!port) return;

    const dbName = await vscode.window.showInputBox({
        prompt: 'Database Name',
        value: config.get('database.name', 'AdventureWorks')
    });

    if (!dbName) return;

    const user = await vscode.window.showInputBox({
        prompt: 'Database User',
        value: config.get('database.user', 'postgres')
    });

    if (!user) return;

    const password = await vscode.window.showInputBox({
        prompt: 'Database Password',
        password: true,
        value: config.get('database.password', '')
    });

    // Save configuration
    await config.update('database.host', host, vscode.ConfigurationTarget.Global);
    await config.update('database.port', parseInt(port), vscode.ConfigurationTarget.Global);
    await config.update('database.name', dbName, vscode.ConfigurationTarget.Global);
    await config.update('database.user', user, vscode.ConfigurationTarget.Global);
    await config.update('database.password', password, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage('Database configuration updated. Restart the server for changes to take effect.');
}

async function showServerStatus() {
    const config = vscode.workspace.getConfiguration('postgresMcp');
    const serverPort = config.get('server.port', 3000);

    try {
        const response = await axios.get(`http://127.0.0.1:${serverPort}/health`, { timeout: 2000 });
        const status = response.data;

        vscode.window.showInformationMessage(
            `MCP Server Status: ${status.status}\n` +
            `Database: ${status.database}\n` +
            `Connected to: ${status.config.database} on ${status.config.host}:${status.config.port}`
        );
    } catch (error) {
        vscode.window.showErrorMessage('MCP server is not responding');
    }
}

async function handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<void> {
    const config = vscode.workspace.getConfiguration('postgresMcp');
    const serverPort = config.get('server.port', 3000);
    const baseUrl = `http://127.0.0.1:${serverPort}`;

    // Check if server is running
    const isRunning = await checkServerHealth(serverPort);
    if (!isRunning) {
        stream.markdown('⚠️ PostgreSQL MCP server is not running. Please start it with the command `PostgreSQL MCP: Start Server`');
        return;
    }

    try {
        const userPrompt = request.prompt;
        const lowerPrompt = userPrompt.toLowerCase().trim();

        // Handle slash commands explicitly
        if (request.command === 'query') {
            await handleQueryRequest(userPrompt, baseUrl, stream);
        } else if (request.command === 'tables') {
            await handleListTablesRequest(baseUrl, stream);
        } else if (request.command === 'describe') {
            await handleDescribeTableRequest(userPrompt, baseUrl, stream);
        } else if (request.command === 'create') {
            await handleCreateRequest(userPrompt, baseUrl, stream);
        } else {
            // For non-command requests, determine if it's direct SQL or natural language
            // Direct SQL patterns - must be at the START of the prompt
            // Covers: SELECT, INSERT, UPDATE, DELETE, CREATE (table/index/view/procedure/function/schema/sequence/trigger),
            //         CREATE OR REPLACE (function/procedure/view/trigger), ALTER, DROP, TRUNCATE, GRANT, REVOKE,
            //         BEGIN, COMMIT, ROLLBACK, EXPLAIN, WITH (CTEs)
            const isDirectSQL = /^(select|insert|update|delete|create(\s+or\s+replace)?\s+(table|index|view|procedure|function|schema|sequence|trigger|type|extension|database)|alter|drop|truncate|grant|revoke|begin|commit|rollback|savepoint|explain|analyze|vacuum|with\s+\w+\s+as)\s+/i.test(lowerPrompt);

            if (isDirectSQL) {
                // Execute as direct SQL
                const sqlLower = lowerPrompt;
                if (sqlLower.startsWith('select') || sqlLower.startsWith('with') || sqlLower.startsWith('explain')) {
                    await handleQueryRequest(userPrompt, baseUrl, stream);
                } else {
                    await handleModificationRequest(userPrompt, baseUrl, stream);
                }
            } else {
                // Use LLM for natural language queries
                await handleGeneralRequest(userPrompt, baseUrl, stream);
            }
        }

    } catch (error: any) {
        stream.markdown(`❌ Error: ${error.message}`);
        outputChannel.appendLine(`Chat error: ${error}`);
    }
}

async function handleQueryRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    // Extract SQL query from prompt or use the prompt as-is
    const query = extractSqlQuery(prompt);

    stream.markdown(`Executing query:\n\`\`\`sql\n${query}\n\`\`\``);

    try {
        const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'query_database',
            arguments: { query }
        });

        const result = response.data.result;
        stream.markdown(`\n**Results:** ${result.row_count} rows\n`);

        if (result.rows.length > 0) {
            // Format as table
            stream.markdown('```\n');
            stream.markdown(formatAsTable(result.rows));
            stream.markdown('\n```');
        }
    } catch (error: any) {
        stream.markdown(`\n❌ Query failed: ${error.response?.data?.detail || error.message}`);
    }
}

async function handleListTablesRequest(baseUrl: string, stream: vscode.ChatResponseStream) {
    stream.markdown('Fetching list of tables...\n');

    try {
        const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'list_tables',
            arguments: { schema: 'public' }
        });

        const result = response.data.result;
        stream.markdown(`\n**Found ${result.count} tables:**\n\n`);

        for (const table of result.tables) {
            stream.markdown(`- ${table.table_name} (${table.table_type})\n`);
        }
    } catch (error: any) {
        stream.markdown(`\n❌ Failed to list tables: ${error.response?.data?.detail || error.message}`);
    }
}

async function handleDescribeTableRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    // Extract table name from prompt
    const tableName = extractTableName(prompt);

    if (!tableName) {
        stream.markdown('Please specify a table name to describe.');
        return;
    }

    stream.markdown(`Describing table: **${tableName}**\n`);

    try {
        const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'describe_table',
            arguments: { table_name: tableName }
        });

        const result = response.data.result;
        stream.markdown(`\n**Columns (${result.column_count}):**\n\n`);

        for (const col of result.columns) {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            stream.markdown(`- **${col.column_name}**: ${col.data_type} ${nullable}${defaultVal}\n`);
        }
    } catch (error: any) {
        stream.markdown(`\n❌ Failed to describe table: ${error.response?.data?.detail || error.message}`);
    }
}

async function handleCreateRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    stream.markdown('Creating database object...\n');

    // For now, use execute_sql for CREATE statements
    try {
        const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'execute_sql',
            arguments: { sql: prompt }
        });

        const result = response.data.result;
        if (result.status === 'success') {
            stream.markdown(`✅ ${result.message}`);
        } else {
            stream.markdown(`❌ ${result.message}`);
        }
    } catch (error: any) {
        stream.markdown(`\n❌ Failed: ${error.response?.data?.detail || error.message}`);
    }
}

async function generateSQLWithLLM(naturalLanguageQuery: string, baseUrl: string): Promise<string> {
    try {
        // Get available tables and their schemas from MCP server
        const tablesResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'list_tables',
            arguments: { schema: 'public' }
        });

        const tables = tablesResponse.data.result.tables.map((t: any) => t.table_name);

        // Get schema for each table
        const schemas: string[] = [];
        for (const table of tables) {
            try {
                const schemaResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                    name: 'describe_table',
                    arguments: { table_name: table }
                });

                const columns = schemaResponse.data.result.columns
                    .map((c: any) => `${c.column_name} ${c.data_type}`)
                    .join(', ');

                schemas.push(`${table} (${columns})`);
            } catch (err) {
                // Skip tables that fail to describe
                schemas.push(`${table}`);
            }
        }

        // Get AI model from configured provider
        const model = await aiProviderManager.getModel();
        outputChannel.appendLine(`[LLM] Using model: ${model.family || model.id}`);

        // Create prompt for SQL generation
        const systemPrompt = `You are a PostgreSQL expert assistant. Convert natural language queries into valid PostgreSQL SQL statements.

**Available Database Schema:**
${schemas.join('\n')}

**Instructions:**
- Return ONLY the SQL statement, no explanations or markdown
- Use proper PostgreSQL syntax
- For queries returning data, use SELECT
- For data modification, use INSERT, UPDATE, DELETE
- For schema changes, use CREATE, ALTER, DROP
- Add appropriate JOINs if multiple tables are needed
- Add LIMIT clauses for safety when selecting large datasets
- Use aggregate functions (COUNT, AVG, MIN, MAX, SUM) when appropriate

**DDL Requirements:**
- For CREATE TABLE: Include appropriate data types, PRIMARY KEY, FOREIGN KEY, and constraints (NOT NULL, UNIQUE, CHECK, DEFAULT)
- For CREATE INDEX: Use appropriate index types (BTREE, HASH, GIN, GIST) and consider partial/conditional indexes
- For stored procedures/functions:
  * Use CREATE OR REPLACE FUNCTION/PROCEDURE for safer updates
  * Use proper PL/pgSQL syntax with $$ delimiters or $BODY$ for function bodies
  * Include parameter types and return types
  * Add appropriate LANGUAGE plpgsql, RETURNS, and attributes (IMMUTABLE, STABLE, VOLATILE)
  * Example: CREATE OR REPLACE FUNCTION func_name(param1 INT) RETURNS INT AS $$ BEGIN ... END; $$ LANGUAGE plpgsql;
- For triggers: Include CREATE TRIGGER with timing (BEFORE/AFTER), events (INSERT/UPDATE/DELETE), and trigger function
- For views: Use CREATE OR REPLACE VIEW for safer updates

**Complex Query Support:**
- Use CTEs (WITH clause) for complex multi-step queries
- Use window functions (ROW_NUMBER(), RANK(), DENSE_RANK(), LAG(), LEAD()) when appropriate
- Use subqueries and correlated subqueries when needed
- Use CASE expressions for conditional logic
- Use JSON/JSONB functions if working with JSON data

**User Request:** ${naturalLanguageQuery}

**SQL:**`;

        const messages = [
            vscode.LanguageModelChatMessage.User(systemPrompt)
        ];

        const chatResponse = await model.sendRequest(messages, {});

        let sqlQuery = '';
        for await (const fragment of chatResponse.text) {
            sqlQuery += fragment;
        }

        // Clean up the response
        sqlQuery = sqlQuery
            .trim()
            .replace(/^```sql\s*/i, '')  // Remove SQL code block start
            .replace(/^```\s*/i, '')     // Remove generic code block start
            .replace(/\s*```$/i, '')     // Remove code block end
            .replace(/;+$/g, ';')        // Normalize semicolons
            .trim();

        // Remove trailing semicolon for consistency
        if (sqlQuery.endsWith(';')) {
            sqlQuery = sqlQuery.slice(0, -1);
        }

        if (!sqlQuery) {
            throw new Error('Failed to generate SQL from your request');
        }

        return sqlQuery;

    } catch (error: any) {
        if (error.message.includes('Copilot')) {
            throw new Error('GitHub Copilot is required for natural language queries. Please ensure Copilot is activated, or provide a direct SQL query.');
        }
        throw new Error(`Failed to generate SQL: ${error.message}`);
    }
}

async function handleGeneralRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    try {
        // Use LLM to generate SQL from natural language
        stream.markdown('🤖 Analyzing your request and generating SQL...\n\n');

        const sqlQuery = await generateSQLWithLLM(prompt, baseUrl);

        stream.markdown(`**Generated SQL:**\n\`\`\`sql\n${sqlQuery}\n\`\`\`\n\n`);
        outputChannel.appendLine(`[LLM Generated SQL]: ${sqlQuery}`);

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
            } else {
                stream.markdown('_No results found._\n');
            }
        } else {
            // Execute as modification (CREATE, INSERT, UPDATE, DELETE, etc.)
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
        outputChannel.appendLine(`[LLM Error]: ${error.message}`);
        stream.markdown(`💡 **Tip:** Try rephrasing your question or provide a direct SQL query.\n\n`);
        stream.markdown(`**Examples:**\n`);
        stream.markdown(`- "How many employees earn more than 70000?"\n`);
        stream.markdown(`- "Show me the top 5 highest paid employees"\n`);
        stream.markdown(`- "Create a table for storing orders"\n`);
        stream.markdown(`- Or write SQL directly: \`SELECT * FROM employees\`\n`);
    }
}

async function handleCountRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    // Try to extract table name and conditions from natural language
    const tableName = extractTableNameFromNL(prompt);
    const condition = extractConditionFromNL(prompt);

    let query = `SELECT COUNT(*) as count FROM ${tableName}`;
    if (condition) {
        query += ` WHERE ${condition}`;
    }

    stream.markdown(`Executing query:\n\`\`\`sql\n${query}\n\`\`\``);

    try {
        const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'query_database',
            arguments: { query }
        });

        const result = response.data.result;
        if (result.rows.length > 0) {
            stream.markdown(`\n**Result:** ${result.rows[0].count} rows match your criteria\n`);
        }
    } catch (error: any) {
        stream.markdown(`\n❌ Query failed: ${error.response?.data?.detail || error.message}`);
        stream.markdown(`\nTry rephrasing or write the SQL query directly using SELECT.`);
    }
}

async function handleInferredQuery(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    const tableName = extractTableNameFromNL(prompt);
    const condition = extractConditionFromNL(prompt);

    let query = `SELECT * FROM ${tableName}`;
    if (condition) {
        query += ` WHERE ${condition}`;
    }
    query += ' LIMIT 50';

    stream.markdown(`Executing query:\n\`\`\`sql\n${query}\n\`\`\``);

    try {
        const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'query_database',
            arguments: { query }
        });

        const result = response.data.result;
        stream.markdown(`\n**Results:** ${result.row_count} rows\n`);

        if (result.rows.length > 0) {
            stream.markdown('```\n');
            stream.markdown(formatAsTable(result.rows));
            stream.markdown('\n```');
        }
    } catch (error: any) {
        stream.markdown(`\n❌ Query failed: ${error.response?.data?.detail || error.message}`);
        stream.markdown(`\nTry rephrasing or write the SQL query directly.`);
    }
}

async function handleAggregateRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    const tableName = extractTableNameFromNL(prompt);
    const lowerPrompt = prompt.toLowerCase();

    let aggFunction = 'AVG';
    if (lowerPrompt.includes('sum')) aggFunction = 'SUM';
    else if (lowerPrompt.includes('max')) aggFunction = 'MAX';
    else if (lowerPrompt.includes('min')) aggFunction = 'MIN';

    // Extract column name (simple heuristic)
    const words = prompt.split(/\s+/);
    const ofIndex = words.findIndex(w => w.toLowerCase() === 'of');
    const column = ofIndex > 0 ? words[ofIndex + 1].replace(/[^a-zA-Z0-9_]/g, '') : 'salary';

    const query = `SELECT ${aggFunction}(${column}) as result FROM ${tableName}`;

    stream.markdown(`Executing query:\n\`\`\`sql\n${query}\n\`\`\``);

    try {
        const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'query_database',
            arguments: { query }
        });

        const result = response.data.result;
        if (result.rows.length > 0) {
            stream.markdown(`\n**Result:** ${result.rows[0].result}\n`);
        }
    } catch (error: any) {
        stream.markdown(`\n❌ Query failed: ${error.response?.data?.detail || error.message}`);
    }
}

async function handleModificationRequest(prompt: string, baseUrl: string, stream: vscode.ChatResponseStream) {
    const sql = extractSqlQuery(prompt);

    stream.markdown(`Executing SQL statement:\n\`\`\`sql\n${sql}\n\`\`\`\n\n`);

    try {
        // Check if this is a multi-statement SQL (contains multiple semicolons outside of function/procedure bodies)
        // For complex DDL with $$, treat as single statement
        const hasDelimitedBody = sql.includes('$$') || sql.includes('$BODY$');
        const statements = hasDelimitedBody ? [sql] : sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        if (statements.length > 1) {
            stream.markdown(`📋 Executing ${statements.length} statements...\n\n`);
            let successCount = 0;

            for (let i = 0; i < statements.length; i++) {
                const stmt = statements[i];
                try {
                    const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                        name: 'execute_sql',
                        arguments: { sql: stmt }
                    });

                    const result = response.data.result;
                    if (result.status === 'success') {
                        successCount++;
                        stream.markdown(`✅ Statement ${i + 1}/${statements.length}: ${result.message}\n`);
                    } else {
                        stream.markdown(`❌ Statement ${i + 1}/${statements.length}: ${result.message}\n`);
                        break; // Stop on first error
                    }
                } catch (error: any) {
                    stream.markdown(`❌ Statement ${i + 1}/${statements.length} failed: ${error.response?.data?.detail || error.message}\n`);
                    break; // Stop on first error
                }
            }

            stream.markdown(`\n**Summary:** ${successCount}/${statements.length} statements executed successfully\n`);
        } else {
            // Single statement
            const response = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                name: 'execute_sql',
                arguments: { sql: sql }
            });

            const result = response.data.result;
            if (result.status === 'success') {
                stream.markdown(`✅ ${result.message}`);
            } else {
                stream.markdown(`❌ ${result.message}`);
            }
        }
    } catch (error: any) {
        stream.markdown(`\n❌ Failed: ${error.response?.data?.detail || error.message}`);
    }
}

function extractTableNameFromNL(prompt: string): string {
    // Common table name patterns
    const patterns = [
        /from\s+(\w+)/i,
        /in\s+(?:the\s+)?(\w+)\s+table/i,
        /(\w+)\s+table/i,
        /table\s+(\w+)/i
    ];

    for (const pattern of patterns) {
        const match = prompt.match(pattern);
        if (match) {
            return match[1];
        }
    }

    // Try common table names
    const commonTables = ['employees', 'users', 'customers', 'orders', 'products', 'suppliers'];
    const lowerPrompt = prompt.toLowerCase();
    for (const table of commonTables) {
        if (lowerPrompt.includes(table)) {
            return table;
        }
    }

    return 'employees'; // default fallback
}

function extractConditionFromNL(prompt: string): string | null {
    const lowerPrompt = prompt.toLowerCase();

    // Greater than patterns
    let match = lowerPrompt.match(/(\w+)\s+(?:greater than|>|more than)\s+(\d+)/);
    if (match) {
        return `${match[1]} > ${match[2]}`;
    }

    // Less than patterns
    match = lowerPrompt.match(/(\w+)\s+(?:less than|<)\s+(\d+)/);
    if (match) {
        return `${match[1]} < ${match[2]}`;
    }

    // Equals patterns
    match = lowerPrompt.match(/(\w+)\s+(?:is|=|equals)\s+['"]?(\w+)['"]?/);
    if (match) {
        return `${match[1]} = '${match[2]}'`;
    }

    // WHERE clause already present
    match = prompt.match(/where\s+(.*?)(?:\s+limit|\s+order|$)/i);
    if (match) {
        return match[1].trim();
    }

    return null;
}

// Helper functions

function findMcpServerPath(context: vscode.ExtensionContext): string | null {
    // Check multiple possible locations
    const possiblePaths = [
        path.join(context.extensionPath, 'mcp-server'),
        path.join(context.extensionPath, '..', '..', 'mcp-server'),
        path.join(process.env.HOME || '', '.postgres-mcp', 'mcp-server')
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(path.join(p, 'server.py'))) {
            return p;
        }
    }

    return null;
}

async function checkServerHealth(port: number): Promise<boolean> {
    try {
        const response = await axios.get(`http://127.0.0.1:${port}/health`, { timeout: 2000 });
        return response.status === 200;
    } catch {
        return false;
    }
}

function updateStatusBar(status: 'running' | 'stopped' | 'error') {
    if (status === 'running') {
        statusBarItem.text = '$(database) PostgreSQL MCP: Running';
        statusBarItem.backgroundColor = undefined;
    } else if (status === 'stopped') {
        statusBarItem.text = '$(database) PostgreSQL MCP: Stopped';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.text = '$(database) PostgreSQL MCP: Error';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
    statusBarItem.show();
}

function extractSqlQuery(prompt: string): string {
    // If the prompt contains SQL code block, extract it
    const codeBlockMatch = prompt.match(/```sql\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }

    // If it starts with SELECT, return as-is
    if (prompt.trim().toUpperCase().startsWith('SELECT')) {
        return prompt.trim();
    }

    // Otherwise, return the prompt (let the user write SQL)
    return prompt;
}

function extractTableName(prompt: string): string | null {
    // Try to extract table name from various patterns
    const patterns = [
        /describe\s+(\w+)/i,
        /table\s+(\w+)/i,
        /(\w+)\s+table/i
    ];

    for (const pattern of patterns) {
        const match = prompt.match(pattern);
        if (match) {
            return match[1];
        }
    }

    // If nothing matches, return the last word
    const words = prompt.trim().split(/\s+/);
    return words[words.length - 1];
}

function formatAsTable(rows: any[]): string {
    if (rows.length === 0) return '';

    const columns = Object.keys(rows[0]);
    const columnWidths = columns.map(col => {
        const maxDataWidth = Math.max(...rows.map(row => String(row[col] || '').length));
        return Math.max(col.length, maxDataWidth);
    });

    let table = '';

    // Header
    table += columns.map((col, i) => col.padEnd(columnWidths[i])).join(' | ') + '\n';
    table += columnWidths.map(w => '-'.repeat(w)).join('-+-') + '\n';

    // Rows
    for (const row of rows.slice(0, 50)) { // Limit to 50 rows
        table += columns.map((col, i) => String(row[col] || '').padEnd(columnWidths[i])).join(' | ') + '\n';
    }

    if (rows.length > 50) {
        table += `\n... and ${rows.length - 50} more rows\n`;
    }

    return table;
}

// Inline Completion Provider for SQL with MCP Context
class PostgreSQLInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined> {

        const config = vscode.workspace.getConfiguration('postgresMcp');

        // Check if inline completions are enabled
        if (!config.get('inline.enabled', true)) {
            return undefined;
        }

        // Check if MCP server is running
        const serverPort = config.get('server.port', 3000);
        const isRunning = await checkServerHealth(serverPort);
        if (!isRunning) {
            return undefined;
        }

        const line = document.lineAt(position.line);
        const textBeforeCursor = document.getText(new vscode.Range(
            new vscode.Position(0, 0),
            position
        ));

        // Trigger patterns for inline completions
        const triggers = {
            createFunction: /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\s*\(/i,
            createProcedure: /CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE\s+(\w+)\s*\(/i,
            createTable: /CREATE\s+TABLE\s+(\w+)\s*\(/i,
            selectFrom: /SELECT\s+.*\s+FROM\s+$/i,
            insertInto: /INSERT\s+INTO\s+(\w+)\s*\(/i,
            updateTable: /UPDATE\s+(\w+)\s+SET\s+$/i,
            joinTable: /\s+JOIN\s+$/i,
            whereClause: /WHERE\s+$/i,
        };

        try {
            // Detect what kind of SQL statement is being written
            if (triggers.createFunction.test(textBeforeCursor) || triggers.createProcedure.test(textBeforeCursor)) {
                return await this.provideFunctionCompletion(document, position, textBeforeCursor);
            } else if (triggers.createTable.test(textBeforeCursor)) {
                return await this.provideTableCompletion(document, position, textBeforeCursor);
            } else if (triggers.selectFrom.test(line.text)) {
                return await this.provideTableSuggestions(document, position);
            } else if (triggers.insertInto.test(line.text)) {
                return await this.provideColumnSuggestions(document, position, line.text);
            } else if (triggers.joinTable.test(line.text)) {
                return await this.provideTableSuggestions(document, position);
            }

            return undefined;
        } catch (error) {
            outputChannel.appendLine(`[Inline Completion Error]: ${error}`);
            return undefined;
        }
    }

    private async provideFunctionCompletion(
        document: vscode.TextDocument,
        position: vscode.Position,
        textBeforeCursor: string
    ): Promise<vscode.InlineCompletionItem[]> {
        try {
            // Refresh schema cache if needed
            await refreshSchemaCacheIfNeeded();

            // Extract function name
            const match = textBeforeCursor.match(/(?:FUNCTION|PROCEDURE)\s+(\w+)/i);
            const functionName = match ? match[1] : 'new_function';

            // Get schema context for better suggestions
            const schemaContext = this.buildSchemaContext();

            // Use Copilot to generate function body with schema context
            let model: vscode.LanguageModelChat;
            try {
                model = await aiProviderManager.getModel();
            } catch (error) {
                outputChannel.appendLine(`[Inline Completion] AI provider not available: ${error}`);
                return [];
            }

            const prompt = `You are a PostgreSQL expert. Complete the following stored procedure/function definition using PL/pgSQL syntax.

**Database Schema Context:**
${schemaContext}

**Current Code:**
${textBeforeCursor}

**Instructions:**
- Complete the function parameters and body
- Use proper PL/pgSQL syntax with BEGIN...END blocks
- Include appropriate RETURNS clause
- Use LANGUAGE plpgsql
- Include proper error handling where appropriate
- Reference available tables from the schema
- Return ONLY the completion text (parameters and body), not the entire function
- Do not include markdown formatting

**Completion:**`;

            const messages = [vscode.LanguageModelChatMessage.User(prompt)];
            const chatResponse = await model.sendRequest(messages, {});

            let completion = '';
            for await (const fragment of chatResponse.text) {
                completion += fragment;
            }

            // Clean up the completion
            completion = completion
                .trim()
                .replace(/^```sql\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();

            if (completion) {
                return [new vscode.InlineCompletionItem(completion)];
            }

            return [];
        } catch (error) {
            outputChannel.appendLine(`[Function Completion Error]: ${error}`);
            return [];
        }
    }

    private async provideTableCompletion(
        document: vscode.TextDocument,
        position: vscode.Position,
        textBeforeCursor: string
    ): Promise<vscode.InlineCompletionItem[]> {
        try {
            await refreshSchemaCacheIfNeeded();

            const schemaContext = this.buildSchemaContext();

            // Use Copilot to suggest table structure
            let model: vscode.LanguageModelChat;
            try {
                model = await aiProviderManager.getModel();
            } catch (error) {
                outputChannel.appendLine(`[Inline Completion] AI provider not available: ${error}`);
                return [];
            }

            const prompt = `You are a PostgreSQL expert. Complete the following CREATE TABLE statement.

**Database Schema Context:**
${schemaContext}

**Current Code:**
${textBeforeCursor}

**Instructions:**
- Complete the column definitions with appropriate data types
- Include PRIMARY KEY, FOREIGN KEY, and other constraints
- Use PostgreSQL data types (INTEGER, VARCHAR, TIMESTAMP, etc.)
- Add indexes if appropriate
- Reference other tables if needed with FOREIGN KEY constraints
- Return ONLY the completion (column definitions and constraints), not the entire CREATE TABLE
- Do not include markdown formatting

**Completion:**`;

            const messages = [vscode.LanguageModelChatMessage.User(prompt)];
            const chatResponse = await model.sendRequest(messages, {});

            let completion = '';
            for await (const fragment of chatResponse.text) {
                completion += fragment;
            }

            completion = completion
                .trim()
                .replace(/^```sql\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();

            if (completion) {
                return [new vscode.InlineCompletionItem(completion)];
            }

            return [];
        } catch (error) {
            outputChannel.appendLine(`[Table Completion Error]: ${error}`);
            return [];
        }
    }

    private async provideTableSuggestions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.InlineCompletionItem[]> {
        await refreshSchemaCacheIfNeeded();

        if (schemaCache.tables.length === 0) {
            return [];
        }

        // Suggest first table name
        const suggestion = schemaCache.tables[0];
        return [new vscode.InlineCompletionItem(suggestion)];
    }

    private async provideColumnSuggestions(
        document: vscode.TextDocument,
        position: vscode.Position,
        lineText: string
    ): Promise<vscode.InlineCompletionItem[]> {
        await refreshSchemaCacheIfNeeded();

        // Extract table name from INSERT INTO statement
        const match = lineText.match(/INSERT\s+INTO\s+(\w+)/i);
        if (!match) {
            return [];
        }

        const tableName = match[1];
        const columns = schemaCache.tableSchemas.get(tableName);

        if (!columns || columns.length === 0) {
            return [];
        }

        // Suggest all column names
        const columnNames = columns.map(c => c.column_name).join(', ');
        return [new vscode.InlineCompletionItem(columnNames + ') VALUES (')];
    }

    private buildSchemaContext(): string {
        const tables = schemaCache.tables.slice(0, 10); // Limit to 10 tables
        const schemaLines: string[] = ['Available Tables:'];

        for (const table of tables) {
            const columns = schemaCache.tableSchemas.get(table);
            if (columns) {
                const columnDefs = columns
                    .slice(0, 5) // Limit to 5 columns per table
                    .map(c => `  ${c.column_name} ${c.data_type}`)
                    .join('\n');
                schemaLines.push(`\n${table}:\n${columnDefs}`);
            } else {
                schemaLines.push(`\n${table}`);
            }
        }

        return schemaLines.join('\n');
    }
}

// Refresh schema cache from MCP server
async function refreshSchemaCache(): Promise<void> {
    const config = vscode.workspace.getConfiguration('postgresMcp');
    const serverPort = config.get('server.port', 3000);
    const baseUrl = `http://127.0.0.1:${serverPort}`;

    try {
        // Check if server is running
        const isRunning = await checkServerHealth(serverPort);
        if (!isRunning) {
            return;
        }

        // Get list of tables
        const tablesResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
            name: 'list_tables',
            arguments: { schema: 'public' }
        }, { timeout: 5000 });

        const tables = tablesResponse.data.result.tables.map((t: any) => t.table_name);
        schemaCache.tables = tables;

        // Get schema for each table (limit to avoid slowdown)
        for (const table of tables.slice(0, 20)) {
            try {
                const schemaResponse = await axios.post(`${baseUrl}/mcp/v1/tools/call`, {
                    name: 'describe_table',
                    arguments: { table_name: table }
                }, { timeout: 3000 });

                schemaCache.tableSchemas.set(table, schemaResponse.data.result.columns);
            } catch (err) {
                // Skip tables that fail
                outputChannel.appendLine(`[Schema Cache] Failed to cache table ${table}: ${err}`);
            }
        }

        schemaCache.lastUpdated = Date.now();
        outputChannel.appendLine(`[Schema Cache] Cached ${tables.length} tables`);

    } catch (error) {
        outputChannel.appendLine(`[Schema Cache] Failed to refresh: ${error}`);
    }
}

// Refresh schema cache if it's older than 5 minutes
async function refreshSchemaCacheIfNeeded(): Promise<void> {
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - schemaCache.lastUpdated > CACHE_TTL) {
        await refreshSchemaCache();
    }
}

async function selectAIProvider() {
    const providers = await aiProviderManager.getAvailableProviders();

    const quickPickItems = providers.map(p => ({
        label: p.label,
        description: p.description,
        detail: p.available ? 'Ready to use' : 'Not available - please install and authenticate',
        id: p.id
    }));

    const selected = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: 'Select AI provider for SQL assistance',
        title: 'PostgreSQL MCP: AI Provider Selection'
    });

    if (selected) {
        const config = vscode.workspace.getConfiguration('postgresMcp');
        await config.update('ai.provider', selected.id, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(
            `AI provider set to: ${selected.label}`,
            'Configure Settings'
        ).then(action => {
            if (action === 'Configure Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'postgresMcp.ai');
            }
        });

        outputChannel.appendLine(`AI provider changed to: ${selected.label}`);
    }
}

export function deactivate() {
    if (mcpServerProcess) {
        mcpServerProcess.kill();
    }
    if (copilotProxyServer) {
        copilotProxyServer.close();
    }
}
