import type { mcpServer } from "@server/organization-do/db/schema";
import type { experimental_createMCPClient as createMCPClient } from "ai";
import { z } from "zod";
import type { ToolSelection } from "./ai";

export type MCPTransport = "sse" | "streamable-http";

type BaseMCPServer = {
	id: string;
	name: string;
	description: string;
	url: string;
	transport: MCPTransport;
};

// For hard-coded, default servers
export type DefaultMCPServer = BaseMCPServer & {
	type: "default";
};

// For servers from the database
export type DBMCPServer = typeof mcpServer.$inferSelect;
export type CustomMCPServer = DBMCPServer & { type: "custom" };

// A unified type for use throughout the app
export type AppMCPServer = DefaultMCPServer | CustomMCPServer;

export type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

/**
 * Configuration for agent-selected MCP servers and tools.
 *
 * - If undefined/not provided: No MCP servers are available
 * - If provided but a server ID is missing: That server is not available
 * - If server ID maps to `true`: All tools from that server are available
 * - If server ID maps to string[]: Only tools in the array are available
 */
export type AgentMCPSelection = Record<string, ToolSelection>;

export const createMcpServerSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	url: z.string().url("Must be a valid URL"),
	transport: z.enum(["sse", "streamable-http"]),
});
