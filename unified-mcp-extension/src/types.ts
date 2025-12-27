export interface MCPServer {
    name: string;
    version: string;
    description: string;
    author: string;
    repository: string;
    filename: string;
    tags: string[];
    downloads: number;
    created_at: string;
    updated_at: string;
    path?: string;
}

export interface ServerConfig {
    [key: string]: string;
}

export interface RunningServer {
    name: string;
    process: any;
    port: number;
    logs: string[];
    config: ServerConfig;
}
