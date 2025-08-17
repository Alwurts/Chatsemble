"use client";

import { honoClient } from "@client/lib/api-client";
import type { AppMCPServer } from "@shared/types/mcp";
import { useQuery } from "@tanstack/react-query";

export function useMCPServers() {
	return useQuery({
		queryKey: ["mcp-servers"],
		queryFn: async (): Promise<AppMCPServer[]> => {
			const response = await honoClient.api.mcp.servers.$get();
			if (!response.ok) {
				throw new Error("Failed to fetch MCP servers");
			}
			return response.json();
		},
	});
}
