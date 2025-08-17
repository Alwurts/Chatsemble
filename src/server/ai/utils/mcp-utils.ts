import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
	AgentMCPSelection,
	AppMCPServer,
	DefaultMCPServer,
	MCPClient,
} from "@shared/types";
import { experimental_createMCPClient as createMCPClient, type Tool } from "ai";

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

export async function initializeMCPClients({
	mcpServers,
	agentSelectedMCPServers,
}: {
	mcpServers: AppMCPServer[];
	agentSelectedMCPServers: AgentMCPSelection | null;
}) {
	const mcpTools: Record<string, Tool> = {};
	const mcpClients: MCPClient[] = [];

	if (
		!agentSelectedMCPServers ||
		Object.keys(agentSelectedMCPServers).length === 0
	) {
		return { mcpClients, mcpTools, closeMCPClients: async () => {} };
	}

	for (const server of mcpServers) {
		const serverToolSelection = agentSelectedMCPServers[server.id];

		// Skip if server is not selected at all or explicitly disabled (false)
		if (serverToolSelection === undefined || serverToolSelection === false) {
			continue;
		}

		// Skip if server is selected with empty array (no tools selected)
		if (
			Array.isArray(serverToolSelection) &&
			serverToolSelection.length === 0
		) {
			continue;
		}

		try {
			const url = new URL(server.url);
			let mcpClient: MCPClient | undefined;
			if (server.transport === "streamable-http") {
				mcpClient = await createMCPClient({
					transport: new StreamableHTTPClientTransport(url),
				});
			} else if (server.transport === "sse") {
				mcpClient = await createMCPClient({
					transport: new SSEClientTransport(url),
				});
			}

			if (!mcpClient) {
				console.error(
					`[initializeMCPClients] Failed to create MCP client for ${server.name}`,
				);
				continue;
			}

			mcpClients.push(mcpClient);

			const toolsFromThisServer = await mcpClient.tools();

			for (const [toolName, tool] of Object.entries(toolsFromThisServer)) {
				if (serverToolSelection === true) {
					// All tools from this server
					mcpTools[toolName] = tool;
				} else if (
					Array.isArray(serverToolSelection) &&
					serverToolSelection.includes(toolName)
				) {
					// Only specific tools from this server
					mcpTools[toolName] = tool;
				}
				// Note: false case is already handled by the continue statements above
			}
		} catch (error) {
			console.error(
				`[initializeMCPClients] Error processing MCP server ${server.name}:`,
				error,
			);
		}
	}

	const closeMCPClients = async () => {
		console.log(`[closeMCPClients] Closing ${mcpClients.length} MCP clients`);
		for (const mcpClient of mcpClients) {
			try {
				await mcpClient?.close();
			} catch (error) {
				console.error("[closeMCPClients] Failed to close MCP client", error);
			}
		}
	};

	return { mcpClients, mcpTools, closeMCPClients };
}

export async function fetchMCPServerTools(
	server: AppMCPServer,
): Promise<Record<string, Tool> | null> {
	try {
		const url = new URL(server.url);
		let mcpClient: MCPClient | undefined;

		if (server.transport === "streamable-http") {
			mcpClient = await createMCPClient({
				transport: new StreamableHTTPClientTransport(url),
			});
		} else if (server.transport === "sse") {
			mcpClient = await createMCPClient({
				transport: new SSEClientTransport(url),
			});
		}

		if (!mcpClient) {
			console.error(
				`[fetchMCPServerTools] Failed to create MCP client for ${server.name}`,
			);
			return null;
		}

		const tools = await mcpClient.tools();
		await mcpClient.close();

		return tools;
	} catch (error) {
		console.error(
			`[fetchMCPServerTools] Failed to fetch tools for ${server.name}`,
			error,
		);
		return null;
	}
}
