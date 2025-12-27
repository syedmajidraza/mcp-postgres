import axios from 'axios';
import { MCPServer } from './types';

export class RegistryClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setUrl(url: string) {
        this.baseUrl = url;
    }

    async listServers(): Promise<MCPServer[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/servers`);
            return response.data.servers || [];
        } catch (error: any) {
            throw new Error(`Failed to fetch servers: ${error.message}`);
        }
    }

    async searchServers(query: string): Promise<MCPServer[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/servers/search`, {
                params: { q: query }
            });
            return response.data.results || [];
        } catch (error: any) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    async getServerDetails(name: string, version: string): Promise<MCPServer> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/servers/${name}/${version}`);
            return response.data;
        } catch (error: any) {
            throw new Error(`Failed to get server details: ${error.message}`);
        }
    }

    async downloadServer(name: string, version: string): Promise<Buffer> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/v1/servers/${name}/${version}/download`,
                { responseType: 'arraybuffer' }
            );
            return Buffer.from(response.data);
        } catch (error: any) {
            throw new Error(`Failed to download server: ${error.message}`);
        }
    }
}
