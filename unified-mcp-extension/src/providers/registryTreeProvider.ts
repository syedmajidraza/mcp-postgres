import * as vscode from 'vscode';
import { MCPServer } from '../types';
import { RegistryClient } from '../registryClient';

export class RegistryTreeProvider implements vscode.TreeDataProvider<RegistryServerItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RegistryServerItem | undefined | null | void> = new vscode.EventEmitter<RegistryServerItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RegistryServerItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private servers: MCPServer[] = [];
    private registryClient: RegistryClient;

    constructor(registryClient: RegistryClient) {
        this.registryClient = registryClient;
        this.refresh();
    }

    refresh(): void {
        this.loadServers();
        this._onDidChangeTreeData.fire();
    }

    private async loadServers() {
        try {
            this.servers = await this.registryClient.listServers();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load servers: ${error.message}`);
            this.servers = [];
        }
    }

    setSearchResults(servers: MCPServer[]): void {
        this.servers = servers;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: RegistryServerItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: RegistryServerItem): Promise<RegistryServerItem[]> {
        if (!element) {
            // Root level - show servers
            return this.servers.map(server => new RegistryServerItem(server));
        }
        return [];
    }
}

class RegistryServerItem extends vscode.TreeItem {
    constructor(public readonly server: MCPServer) {
        super(`${server.name} v${server.version}`, vscode.TreeItemCollapsibleState.None);

        this.tooltip = `${server.description}\n\nAuthor: ${server.author}\nDownloads: ${server.downloads}\nTags: ${server.tags.join(', ')}`;
        this.description = server.description.substring(0, 50) + (server.description.length > 50 ? '...' : '');
        this.contextValue = 'registryServer';

        this.iconPath = new vscode.ThemeIcon('cloud-download');
    }
}
