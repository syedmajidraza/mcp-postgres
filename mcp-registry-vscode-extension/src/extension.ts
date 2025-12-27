import * as vscode from 'vscode';
import { AvailableServersProvider } from './providers/availableServersProvider';
import { InstalledServersProvider } from './providers/installedServersProvider';
import { RegistryClient } from './registryClient';
import { MCPServerManager } from './mcpServerManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('MCP Registry Manager extension is now active');

    // Get configuration
    const config = vscode.workspace.getConfiguration('mcpRegistry');
    const registryUrl = config.get<string>('registryUrl') || 'http://localhost:8000';

    // Initialize services
    const registryClient = new RegistryClient(registryUrl);
    const serverManager = new MCPServerManager(context);

    // Initialize tree data providers
    const availableServersProvider = new AvailableServersProvider(registryClient);
    const installedServersProvider = new InstalledServersProvider(serverManager);

    // Register tree views
    vscode.window.registerTreeDataProvider('mcpRegistry.availableServers', availableServersProvider);
    vscode.window.registerTreeDataProvider('mcpRegistry.installedServers', installedServersProvider);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.refreshServers', () => {
            availableServersProvider.refresh();
            installedServersProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.installServer', async (item) => {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${item.label}...`,
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ increment: 20, message: 'Downloading package...' });
                    await serverManager.installServer(item.server);

                    progress.report({ increment: 80, message: 'Installation complete!' });
                    vscode.window.showInformationMessage(`Successfully installed ${item.server.name}@${item.server.version}`);

                    installedServersProvider.refresh();
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to install ${item.label}: ${error.message}`);
                }
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.startServer', async (item) => {
            try {
                await serverManager.startServer(item.serverName);
                vscode.window.showInformationMessage(`Started ${item.label}`);
                installedServersProvider.refresh();
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to start ${item.label}: ${error.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.stopServer', async (item) => {
            try {
                await serverManager.stopServer(item.serverName);
                vscode.window.showInformationMessage(`Stopped ${item.label}`);
                installedServersProvider.refresh();
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to stop ${item.label}: ${error.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.restartServer', async (item) => {
            try {
                await serverManager.restartServer(item.serverName);
                vscode.window.showInformationMessage(`Restarted ${item.label}`);
                installedServersProvider.refresh();
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to restart ${item.label}: ${error.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.uninstallServer', async (item) => {
            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to uninstall ${item.label}?`,
                'Yes',
                'No'
            );

            if (answer === 'Yes') {
                try {
                    await serverManager.uninstallServer(item.serverName);
                    vscode.window.showInformationMessage(`Uninstalled ${item.label}`);
                    installedServersProvider.refresh();
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to uninstall ${item.label}: ${error.message}`);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.viewLogs', (item) => {
            const logs = serverManager.getServerLogs(item.serverName);
            const doc = vscode.workspace.openTextDocument({ content: logs, language: 'log' });
            doc.then(d => vscode.window.showTextDocument(d));
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.configure', async (item) => {
            await serverManager.configureServer(item.serverName);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.setRegistryUrl', async () => {
            const url = await vscode.window.showInputBox({
                prompt: 'Enter MCP Registry URL',
                value: registryUrl,
                placeHolder: 'http://localhost:8000'
            });

            if (url) {
                await config.update('registryUrl', url, vscode.ConfigurationTarget.Global);
                registryClient.setUrl(url);
                availableServersProvider.refresh();
                vscode.window.showInformationMessage(`Registry URL updated to ${url}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.searchServers', async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'Search MCP Servers',
                placeHolder: 'Enter search term...'
            });

            if (query) {
                try {
                    const results = await registryClient.searchServers(query);
                    if (results.length === 0) {
                        vscode.window.showInformationMessage('No servers found');
                    } else {
                        availableServersProvider.setSearchResults(results);
                    }
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Search failed: ${error.message}`);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcpRegistry.showServerDetails', async (item) => {
            const panel = vscode.window.createWebviewPanel(
                'mcpServerDetails',
                `${item.server.name} Details`,
                vscode.ViewColumn.One,
                {}
            );

            panel.webview.html = getServerDetailsHtml(item.server);
        })
    );

    // Auto-start servers if configured
    if (config.get<boolean>('autoStart')) {
        serverManager.startAllServers().catch(err => {
            console.error('Failed to auto-start servers:', err);
        });
    }

    vscode.window.showInformationMessage('MCP Registry Manager is ready!');
}

function getServerDetailsHtml(server: any): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${server.name}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                h1 { color: var(--vscode-editor-foreground); }
                .info-row {
                    margin: 10px 0;
                    display: flex;
                    gap: 10px;
                }
                .info-label {
                    font-weight: bold;
                    min-width: 120px;
                }
                .tag {
                    display: inline-block;
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 8px;
                    border-radius: 3px;
                    margin-right: 5px;
                    font-size: 0.9em;
                }
            </style>
        </head>
        <body>
            <h1>${server.name}</h1>
            <div class="info-row">
                <span class="info-label">Version:</span>
                <span>${server.version}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Description:</span>
                <span>${server.description}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Author:</span>
                <span>${server.author}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Repository:</span>
                <span><a href="${server.repository}">${server.repository}</a></span>
            </div>
            <div class="info-row">
                <span class="info-label">Downloads:</span>
                <span>${server.downloads}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tags:</span>
                <span>${server.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Created:</span>
                <span>${new Date(server.created_at).toLocaleString()}</span>
            </div>
        </body>
        </html>
    `;
}

export function deactivate() {
    console.log('MCP Registry Manager extension is deactivated');
}
