import * as vscode from 'vscode';
import { ServerManager } from '../serverManager';

export class InstalledTreeProvider implements vscode.TreeDataProvider<InstalledServerItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<InstalledServerItem | undefined | null | void> = new vscode.EventEmitter<InstalledServerItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<InstalledServerItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private serverManager: ServerManager;

    constructor(serverManager: ServerManager) {
        this.serverManager = serverManager;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InstalledServerItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: InstalledServerItem): Promise<InstalledServerItem[]> {
        if (!element) {
            // Root level - show installed servers
            const installed = this.serverManager.getInstalledServers();
            return installed.map(name => new InstalledServerItem(
                name,
                this.serverManager.isServerRunning(name)
            ));
        }
        return [];
    }
}

class InstalledServerItem extends vscode.TreeItem {
    constructor(
        public readonly serverName: string,
        public readonly isRunning: boolean
    ) {
        super(serverName, vscode.TreeItemCollapsibleState.None);

        this.description = isRunning ? '● Running' : '○ Stopped';
        this.contextValue = isRunning ? 'installedServer-running' : 'installedServer-stopped';

        if (isRunning) {
            this.iconPath = new vscode.ThemeIcon('debug-start', new vscode.ThemeColor('charts.green'));
        } else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }

        this.tooltip = isRunning ? `${serverName} is running` : `${serverName} is stopped`;
    }
}
