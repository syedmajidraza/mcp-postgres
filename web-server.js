#!/usr/bin/env node
/**
 * Standalone Web Server for PostgreSQL Chatbot
 * Serves the chatbot UI and proxies requests to GitHub Copilot and MCP Server
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const MCP_SERVER_URL = 'http://localhost:3000';
const COPILOT_BRIDGE_URL = 'http://localhost:9001'; // VS Code extension on different port

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`${req.method} ${req.url}`);

    // Serve HTML at root
    if (req.url === '/' && req.method === 'GET') {
        const htmlPath = path.join(__dirname, 'index.html');
        try {
            const html = fs.readFileSync(htmlPath, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('index.html not found');
        }
        return;
    }

    // Health check
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy' }));
        return;
    }

    // Agent info endpoint
    if (req.url === '/agent/info' && req.method === 'GET') {
        const mcpHealth = await fetch(`${MCP_SERVER_URL}/health`).then(r => r.json()).catch(() => null);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            agentUrl: 'localhost:9000',
            mcpServerUrl: MCP_SERVER_URL,
            database: mcpHealth?.config || {}
        }));
        return;
    }

    // MCP Tool endpoints - proxy to MCP server
    if (req.url.startsWith('/tool/') && req.method === 'POST') {
        const toolName = req.url.replace('/tool/', '');
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const args = JSON.parse(body);
                const response = await fetch(`${MCP_SERVER_URL}/mcp/v1/tools/call`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: toolName, arguments: args })
                });
                const data = await response.json();
                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Chat endpoint - proxy to Copilot Bridge
    if (req.url === '/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                // Forward request to Copilot Bridge extension
                const response = await fetch(`${COPILOT_BRIDGE_URL}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                });

                const data = await response.json();
                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (error) {
                console.error('Error proxying to Copilot Bridge:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Failed to connect to Copilot Bridge. Make sure VS Code extension is running on port 9001.',
                    details: error.message
                }));
            }
        });
        return;
    }

    // Not found
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`\n🚀 PostgreSQL Chatbot Server running!`);
    console.log(`\n   📱 Web UI:        http://localhost:${PORT}`);
    console.log(`   🔌 MCP Server:    ${MCP_SERVER_URL}`);
    console.log(`   🤖 Copilot:       ${COPILOT_BRIDGE_URL}`);
    console.log(`\n   Open your browser to: http://localhost:${PORT}\n`);
});
