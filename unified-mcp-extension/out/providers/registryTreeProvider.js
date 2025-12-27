"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class RegistryTreeProvider {
    constructor(registryClient) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.servers = [];
        this.registryClient = registryClient;
        this.refresh();
    }
    refresh() {
        this.loadServers();
        this._onDidChangeTreeData.fire();
    }
    async loadServers() {
        try {
            this.servers = await this.registryClient.listServers();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to load servers: ${error.message}`);
            this.servers = [];
        }
    }
    setSearchResults(servers) {
        this.servers = servers;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show servers
            return this.servers.map(server => new RegistryServerItem(server));
        }
        return [];
    }
}
exports.RegistryTreeProvider = RegistryTreeProvider;
class RegistryServerItem extends vscode.TreeItem {
    constructor(server) {
        super(`${server.name} v${server.version}`, vscode.TreeItemCollapsibleState.None);
        this.server = server;
        this.tooltip = `${server.description}\n\nAuthor: ${server.author}\nDownloads: ${server.downloads}\nTags: ${server.tags.join(', ')}`;
        this.description = server.description.substring(0, 50) + (server.description.length > 50 ? '...' : '');
        this.contextValue = 'registryServer';
        this.iconPath = new vscode.ThemeIcon('cloud-download');
    }
}
//# sourceMappingURL=registryTreeProvider.js.map