import type { DBMCPServer, DefaultMCPServer } from "@shared/types/mcp";
import type { ChatRoomDbServices } from "./db/services";

// Default MCP servers (hardcoded)
export const defaultMcpServers: DefaultMCPServer[] = [
	{
		id: "default-github",
		name: "GitHub Tools",
		description: "GitHub repository management and search tools",
		url: "https://github-mcp.example.com",
		transport: "streamable-http",
		type: "default",
	},
	{
		id: "default-web-search",
		name: "Web Search",
		description: "Search the web for information",
		url: "https://search-mcp.example.com",
		transport: "sse",
		type: "default",
	},
];

interface MCPServerDependencies {
	dbServices: ChatRoomDbServices;
}

export class MCPServers {
	private deps: MCPServerDependencies;

	constructor(deps: MCPServerDependencies) {
		this.deps = deps;
	}

	getMcpServers = async (): Promise<DBMCPServer[]> => {
		return await this.deps.dbServices.getAllMCPServers();
	};

	createMcpServer = async (
		data: Parameters<ChatRoomDbServices["createMCPServer"]>[0],
	): Promise<DBMCPServer> => {
		return await this.deps.dbServices.createMCPServer(data);
	};

	updateMcpServer = async (
		id: string,
		data: Partial<Parameters<ChatRoomDbServices["updateMCPServer"]>[1]>,
	): Promise<DBMCPServer> => {
		return await this.deps.dbServices.updateMCPServer(id, data);
	};

	deleteMcpServer = async (id: string): Promise<DBMCPServer> => {
		return await this.deps.dbServices.deleteMCPServer(id);
	};
}
