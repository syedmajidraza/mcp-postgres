#!/usr/bin/env node
/**
 * Standalone Copilot Web Bridge Server
 * Runs WITHOUT VS Code - true headless mode
 *
 * This is a Node.js server that replicates the VS Code extension functionality
 * but runs as a standalone process without requiring VS Code at all.
 */

const http = require('http');
const https = require('https');

// Configuration
const PORT = 9001;
const MCP_SERVER_URL = 'http://localhost:3000';

// GitHub Copilot authentication token
// This will be loaded from VS Code's storage location
const fs = require('fs');
const path = require('path');
const os = require('os');

let copilotToken = null;

// Load GitHub Copilot token from VS Code storage
function loadCopilotToken() {
    try {
        // macOS path to GitHub Copilot credentials
        const credentialsPath = path.join(
            os.homedir(),
            'Library/Application Support/Code/User/globalStorage/github.copilot'
        );

        // Look for credential files
        const files = fs.readdirSync(credentialsPath);

        // Find the most recent credential file
        const credFile = files
            .filter(f => f.startsWith('user-'))
            .sort()
            .reverse()[0];

        if (credFile) {
            const credPath = path.join(credentialsPath, credFile);
            const credData = JSON.parse(fs.readFileSync(credPath, 'utf8'));

            if (credData && credData.oauth_token) {
                copilotToken = credData.oauth_token;
                console.log('✅ Loaded GitHub Copilot token from VS Code storage');
                return true;
            }
        }
    } catch (error) {
        console.warn('⚠️  Could not load Copilot token:', error.message);
        console.warn('   You need to authenticate GitHub Copilot in VS Code first');
    }
    return false;
}

// Make request to GitHub Copilot API
async function queryCopilot(messages) {
    return new Promise((resolve, reject) => {
        if (!copilotToken) {
            return reject(new Error('No Copilot token available'));
        }

        const requestData = JSON.stringify({
            messages: messages,
            model: 'gpt-4',
            temperature: 0,
            max_tokens: 2000
        });

        const options = {
            hostname: 'api.githubcopilot.com',
            port: 443,
            path: '/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${copilotToken}`,
                'Content-Type': 'application/json',
                'Editor-Version': 'vscode/1.85.0',
                'Editor-Plugin-Version': 'copilot/1.0.0',
                'User-Agent': 'GitHubCopilotChat/1.0.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(requestData);
        req.end();
    });
}

// Call MCP tool
async function callMcpTool(toolName, args) {
    return new Promise((resolve, reject) => {
        const requestData = JSON.stringify({
            name: toolName,
            arguments: args
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/mcp/v1/tools/call',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': requestData.length
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(requestData);
        req.end();
    });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', mode: 'standalone', copilot: !!copilotToken }));
        return;
    }

    // Chat endpoint
    if (req.url === '/chat' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { message, conversation } = JSON.parse(body);

                // Build conversation history for Copilot
                const messages = [
                    {
                        role: 'system',
                        content: `You are a PostgreSQL database assistant. You help users query their database using natural language.

Available database tools:
- query_database(sql): Execute SELECT queries
- execute_sql(sql): Execute INSERT/UPDATE/DELETE/CREATE queries
- list_tables(): Get all table names
- describe_table(name): Get table schema
- get_table_indexes(name): Get table indexes
- analyze_query_plan(sql): Get query execution plan
- create_table(name, columns, constraints): Create new table
- create_stored_procedure(name, params, body): Create stored procedure

When a user asks a question:
1. Determine if you need to use a tool
2. If yes, respond with JSON: {"tool": "tool_name", "args": {...}}
3. If no tool needed, respond with a helpful message

Format tool calls as valid JSON only.`
                    }
                ];

                // Add conversation history
                if (conversation && Array.isArray(conversation)) {
                    messages.push(...conversation);
                }

                // Add current message
                messages.push({
                    role: 'user',
                    content: message
                });

                // Query GitHub Copilot
                const copilotResponse = await queryCopilot(messages);

                if (copilotResponse.choices && copilotResponse.choices[0]) {
                    const assistantMessage = copilotResponse.choices[0].message.content;

                    // Check if response is a tool call
                    try {
                        const toolCall = JSON.parse(assistantMessage);
                        if (toolCall.tool && toolCall.args) {
                            // Execute the tool
                            const toolResult = await callMcpTool(toolCall.tool, toolCall.args);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                response: assistantMessage,
                                toolCall: toolCall,
                                toolResult: toolResult
                            }));
                            return;
                        }
                    } catch (e) {
                        // Not a tool call, just a regular response
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ response: assistantMessage }));
                } else {
                    throw new Error('Invalid Copilot response');
                }

            } catch (error) {
                console.error('Chat error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start server
function startServer() {
    // Try to load Copilot token
    const hasToken = loadCopilotToken();

    if (!hasToken) {
        console.log('');
        console.log('⚠️  WARNING: No GitHub Copilot token found!');
        console.log('   This server will NOT work until you authenticate Copilot in VS Code.');
        console.log('');
        console.log('   Steps to authenticate:');
        console.log('   1. Open VS Code normally (with UI)');
        console.log('   2. Ensure GitHub Copilot extension is installed');
        console.log('   3. Sign in to GitHub Copilot when prompted');
        console.log('   4. Close VS Code and run this headless server again');
        console.log('');
    }

    server.listen(PORT, '127.0.0.1', () => {
        console.log('');
        console.log('🚀 Standalone Copilot Web Bridge Server');
        console.log('========================================');
        console.log('');
        console.log(`✅ Server running on: http://localhost:${PORT}`);
        console.log(`✅ MCP Server: ${MCP_SERVER_URL}`);
        console.log(`✅ Copilot Token: ${hasToken ? 'Loaded' : 'NOT FOUND'}`);
        console.log('');
        console.log('Endpoints:');
        console.log(`  GET  /health - Health check`);
        console.log(`  POST /chat   - Chat with database`);
        console.log('');
        console.log('Press Ctrl+C to stop');
        console.log('');
    });
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down Copilot Bridge...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

// Start the server
startServer();
