const express = require('express');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
const COPILOT_PROXY_URL = process.env.COPILOT_PROXY_URL || 'http://localhost:9000';

// OpenAI ChatGPT configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// GitHub OAuth configuration removed - using VS Code Copilot proxy instead (no OAuth needed!)

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session management
app.use(session({
    secret: process.env.SESSION_SECRET || 'postgres-mcp-chatbot-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: 3600000 // 1 hour
    }
}));

// Redirect root to simple interface (MUST be before static middleware)
app.get('/', (req, res) => {
    console.log('Root route - Session user:', req.session.user);

    // If already logged in, show chat
    if (req.session.user) {
        console.log('Serving index.html (chat interface)');
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } else {
        // Show simple provider selection page
        console.log('Serving index-simple.html (provider selection)');
        res.sendFile(path.join(__dirname, '../public/index-simple.html'));
    }
});

// Static files (AFTER root route to prevent index.html from being served automatically)
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    if (req.session.user) {
        res.json({
            authenticated: true,
            provider: req.session.provider,
            user: {
                name: req.session.user.name || req.session.user.login,
                email: req.session.user.email,
                avatar: req.session.user.avatar_url
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// ============================================================================
// GITHUB COPILOT (via VS Code Copilot Proxy - No OAuth needed!)
// ============================================================================

// GitHub Copilot "login" - uses VS Code Copilot via proxy (no OAuth needed)
app.get('/auth/github', (req, res) => {
    // Create session for GitHub Copilot (uses VS Code extension's Copilot proxy)
    req.session.user = {
        name: 'VS Code User',
        email: 'user@vscode.local',
        avatar_url: 'https://ui-avatars.com/api/?name=VS+Code&background=007acc&color=fff'
    };
    req.session.provider = 'github';
    req.session.authenticated = true;

    console.log('✅ User selected GitHub Copilot (using VS Code Copilot via proxy on port 9000)');

    // Save session before redirect
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ error: 'Failed to save session' });
        }
        res.redirect('/');
    });
});

// GitHub OAuth callback removed - not needed, using VS Code Copilot proxy directly

// ============================================================================
// CHATGPT (OpenAI API)
// ============================================================================

// ChatGPT "login" - uses OpenAI API key from .env
app.get('/auth/chatgpt', (req, res) => {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
        return res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>ChatGPT Not Configured</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
                    .error-box { background: #fee; border: 2px solid #fcc; padding: 30px; border-radius: 10px; }
                    h1 { color: #c33; }
                    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
                    a { color: #667eea; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="error-box">
                    <h1>🔑 ChatGPT Not Configured</h1>
                    <p>To use ChatGPT, add your OpenAI API key to <code>.env</code>:</p>
                    <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left;">OPENAI_API_KEY=your_api_key_here</pre>
                    <p>Get your API key: <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI API Keys</a></p>
                    <p><a href="/">← Go Back</a></p>
                </div>
            </body>
            </html>
        `);
    }

    // Create session for ChatGPT
    req.session.user = {
        name: 'ChatGPT User',
        email: 'user@openai.com',
        avatar_url: 'https://ui-avatars.com/api/?name=ChatGPT&background=10a37f&color=fff'
    };
    req.session.provider = 'chatgpt';
    req.session.authenticated = true;

    console.log('✅ User selected ChatGPT (using OpenAI API)');

    // Save session before redirect
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ error: 'Failed to save session' });
        }
        res.redirect('/');
    });
});

// ============================================================================
// LOGOUT
// ============================================================================

app.get('/auth/logout', (req, res) => {
    const provider = req.session.provider;
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        console.log(`👋 User logged out (${provider})`);
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required. Please login.' });
    }
    next();
}

// ============================================================================
// AI SQL GENERATION
// ============================================================================

// Generate SQL using appropriate AI provider
app.post('/api/generate-sql', requireAuth, async (req, res) => {
    const { query, schema } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        let sqlResult;

        if (req.session.provider === 'github') {
            sqlResult = await generateSQLWithGitHubCopilot(
                req.session.githubToken,
                query,
                schema || ''
            );
        } else if (req.session.provider === 'chatgpt') {
            sqlResult = await generateSQLWithChatGPT(query, schema || '');
        } else {
            throw new Error('Unknown provider');
        }

        res.json({ sql: sqlResult });

    } catch (error) {
        console.error(`SQL generation error (${req.session.provider}):`, error.message);
        res.status(500).json({
            error: error.message,
            details: error.response?.data || null
        });
    }
});

// GitHub Copilot SQL generation
async function generateSQLWithGitHubCopilot(token, query, schema) {
    try {
        // Use VS Code Copilot via local proxy (no API key needed!)
        const response = await axios.post(
            `${COPILOT_PROXY_URL}/copilot/generate`,
            {
                query: query,
                schema: schema
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const sqlText = response.data.sql;
        return cleanSQL(sqlText);

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            throw new Error('VS Code Copilot proxy not running. Make sure the VS Code extension is active.');
        }
        throw new Error(`Copilot proxy error: ${error.message}`);
    }
}

// ChatGPT (OpenAI) SQL generation
async function generateSQLWithChatGPT(query, schema) {
    const prompt = `You are a PostgreSQL expert assistant. Convert the following natural language query into a valid PostgreSQL SQL statement.

**Available Database Schema:**
${schema || 'No schema provided'}

**Instructions:**
- Return ONLY the SQL statement, no explanations or markdown
- Use proper PostgreSQL syntax
- For queries returning data, use SELECT
- Add appropriate JOINs if multiple tables are needed
- Add LIMIT clauses for safety when selecting large datasets

**User Request:** ${query}

**SQL:**`;

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'You are a PostgreSQL expert assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.3
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const sqlText = response.data.choices[0].message.content.trim();
        return cleanSQL(sqlText);

    } catch (error) {
        throw new Error(`ChatGPT API error: ${error.response?.data?.error?.message || error.message}`);
    }
}

// Clean SQL output (remove markdown, extra formatting)
function cleanSQL(sql) {
    return sql
        .trim()
        .replace(/^```sql\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/;+$/g, ';')
        .trim();
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

// Get database schema
app.get('/api/schema', requireAuth, async (req, res) => {
    try {
        const schema = await getDatabaseSchema();
        res.json({ schema });
    } catch (error) {
        console.error('Schema fetch error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Execute SQL query
app.post('/api/execute', requireAuth, async (req, res) => {
    const { sql } = req.body;

    if (!sql) {
        return res.status(400).json({ error: 'SQL query is required' });
    }

    try {
        const response = await axios.post(`${MCP_SERVER_URL}/mcp/v1/tools/call`, {
            name: 'query_database',
            arguments: { query: sql }
        });

        res.json({
            success: true,
            result: response.data.result
        });

    } catch (error) {
        console.error('SQL execution error:', error.message);
        res.status(500).json({
            error: error.response?.data?.error || error.message
        });
    }
});

// Chat endpoint - generate SQL and optionally execute
app.post('/api/chat', requireAuth, async (req, res) => {
    try {
        const { message, execute = true } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Step 1: Get database schema
        const schema = await getDatabaseSchema();

        // Step 2: Generate SQL using user's AI provider
        let sqlQuery;

        if (req.session.provider === 'github') {
            sqlQuery = await generateSQLWithGitHubCopilot(
                req.session.githubToken,
                message,
                schema
            );
        } else if (req.session.provider === 'chatgpt') {
            sqlQuery = await generateSQLWithChatGPT(message, schema);
        }

        // Step 3: Optionally execute SQL
        let result = null;
        if (execute && sqlQuery.toUpperCase().startsWith('SELECT')) {
            try {
                const response = await axios.post(`${MCP_SERVER_URL}/mcp/v1/tools/call`, {
                    name: 'query_database',
                    arguments: { query: sqlQuery }
                });
                result = response.data.result;
            } catch (error) {
                console.warn('SQL execution failed:', error.message);
                // Continue without results
            }
        }

        res.json({
            sql: sqlQuery,
            result,
            provider: req.session.provider
        });

    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getDatabaseSchema() {
    try {
        // Get list of tables
        const tablesResponse = await axios.post(`${MCP_SERVER_URL}/mcp/v1/tools/call`, {
            name: 'list_tables',
            arguments: { schema: 'public' }
        });

        const tables = tablesResponse.data.result.tables.map(t => t.table_name);
        const schemas = [];

        // Get schema for each table
        for (const table of tables) {
            try {
                const schemaResponse = await axios.post(`${MCP_SERVER_URL}/mcp/v1/tools/call`, {
                    name: 'describe_table',
                    arguments: { table_name: table }
                });

                const columns = schemaResponse.data.result.columns
                    .map(c => `${c.column_name} ${c.data_type}`)
                    .join(', ');

                schemas.push(`${table} (${columns})`);
            } catch (err) {
                schemas.push(`${table}`);
            }
        }

        return schemas.join('\n');
    } catch (error) {
        throw new Error(`Failed to fetch database schema: ${error.message}`);
    }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', async (req, res) => {
    try {
        const mcpHealth = await axios.get(`${MCP_SERVER_URL}/health`, { timeout: 2000 });

        res.json({
            status: 'running',
            authentication: 'Simple provider selection',
            services: {
                mcp: {
                    ...mcpHealth.data,
                    server_url: MCP_SERVER_URL
                },
                copilot: { status: 'available', type: 'VS Code Proxy' },
                chatgpt: OPENAI_API_KEY ? 'configured' : 'requires API key'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'degraded',
            error: error.message
        });
    }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log('\n🚀 PostgreSQL MCP Web Chatbot running!');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`\n🤖 AI Providers:`);
    console.log(`   ✅ GitHub Copilot (via VS Code proxy)`);
    console.log(`   ${OPENAI_API_KEY ? '✅' : '⚙️ '} ChatGPT${OPENAI_API_KEY ? '' : ' (requires API key)'}`);
    console.log(`\n📊 Services:`);
    console.log(`   MCP Server: ${MCP_SERVER_URL}`);
    console.log(`   Copilot Proxy: ${COPILOT_PROXY_URL}`);
    console.log('\n✨ Ready to chat with your PostgreSQL database!\n');
});
