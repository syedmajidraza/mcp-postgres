"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryClient = void 0;
const axios_1 = __importDefault(require("axios"));
class RegistryClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    setUrl(url) {
        this.baseUrl = url;
    }
    async listServers() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/v1/servers`);
            return response.data.servers || [];
        }
        catch (error) {
            throw new Error(`Failed to fetch servers: ${error.message}`);
        }
    }
    async searchServers(query) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/v1/servers/search`, {
                params: { q: query }
            });
            return response.data.results || [];
        }
        catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }
    async getServerDetails(name, version) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/v1/servers/${name}/${version}`);
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to get server details: ${error.message}`);
        }
    }
    async downloadServer(name, version) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/v1/servers/${name}/${version}/download`, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        }
        catch (error) {
            throw new Error(`Failed to download server: ${error.message}`);
        }
    }
}
exports.RegistryClient = RegistryClient;
//# sourceMappingURL=registryClient.js.map