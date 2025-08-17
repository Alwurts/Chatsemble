import type { BaseMCPServer } from "@shared/types/mcp";
import { eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { mcpServer } from "../schema";

export function createMCPServerService(db: DrizzleSqliteDODatabase) {
	return {
		async createMCPServer(
			newMCPServerData: typeof mcpServer.$inferInsert,
		): Promise<BaseMCPServer> {
			const newMCPServer = await db
				.insert(mcpServer)
				.values(newMCPServerData)
				.returning()
				.get();

			if (!newMCPServer) {
				throw new Error("Failed to create MCP server");
			}

			return newMCPServer;
		},

		getAllMCPServers: async () => {
			const servers = await db.select().from(mcpServer);
			return servers;
		},

		getMCPServerById: async (serverId: string) => {
			const server = await db
				.select()
				.from(mcpServer)
				.where(eq(mcpServer.id, serverId))
				.get();
			return server;
		},

		updateMCPServer: async (
			serverId: string,
			updateData: Partial<typeof mcpServer.$inferInsert>,
		) => {
			const updatedServer = await db
				.update(mcpServer)
				.set({ ...updateData, updatedAt: Date.now() })
				.where(eq(mcpServer.id, serverId))
				.returning()
				.get();

			if (!updatedServer) {
				throw new Error("Failed to update MCP server");
			}

			return updatedServer;
		},

		deleteMCPServer: async (serverId: string) => {
			const deletedServer = await db
				.delete(mcpServer)
				.where(eq(mcpServer.id, serverId))
				.returning()
				.get();

			if (!deletedServer) {
				throw new Error("Failed to delete MCP server");
			}
			return deletedServer;
		},
	};
}
