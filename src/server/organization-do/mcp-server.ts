import type { BaseMCPServer } from "@shared/types/mcp";
import type { ChatRoomDbServices } from "./db/services";

interface MCPServerDependencies {
	dbServices: ChatRoomDbServices;
}

export class MCPServers {
	private deps: MCPServerDependencies;

	constructor(deps: MCPServerDependencies) {
		this.deps = deps;
	}

	getMcpServers = async (): Promise<BaseMCPServer[]> => {
		return await this.deps.dbServices.getAllMCPServers();
	};

	createMcpServer = async (
		data: Parameters<ChatRoomDbServices["createMCPServer"]>[0],
	): Promise<BaseMCPServer> => {
		return await this.deps.dbServices.createMCPServer(data);
	};

	updateMcpServer = async (
		id: string,
		data: Partial<Parameters<ChatRoomDbServices["updateMCPServer"]>[1]>,
	): Promise<BaseMCPServer> => {
		return await this.deps.dbServices.updateMCPServer(id, data);
	};

	deleteMcpServer = async (id: string): Promise<BaseMCPServer> => {
		return await this.deps.dbServices.deleteMCPServer(id);
	};
}
