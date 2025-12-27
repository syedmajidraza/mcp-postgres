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
exports.InstalledTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class InstalledTreeProvider {
    constructor(serverManager) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.serverManager = serverManager;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show installed servers
            const installed = this.serverManager.getInstalledServers();
            return installed.map(name => new InstalledServerItem(name, this.serverManager.isServerRunning(name)));
        }
        return [];
    }
}
exports.InstalledTreeProvider = InstalledTreeProvider;
class InstalledServerItem extends vscode.TreeItem {
    constructor(serverName, isRunning) {
        super(serverName, vscode.TreeItemCollapsibleState.None);
        this.serverName = serverName;
        this.isRunning = isRunning;
        this.description = isRunning ? '● Running' : '○ Stopped';
        this.contextValue = isRunning ? 'installedServer-running' : 'installedServer-stopped';
        if (isRunning) {
            this.iconPath = new vscode.ThemeIcon('debug-start', new vscode.ThemeColor('charts.green'));
        }
        else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
        this.tooltip = isRunning ? `${serverName} is running` : `${serverName} is stopped`;
    }
}
//# sourceMappingURL=installedTreeProvider.js.map