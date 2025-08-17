import { zValidator } from "@hono/zod-validator";
import { fetchMCPServerTools } from "@server/ai/utils/mcp-utils";
import { defaultMcpServers } from "@server/organization-do/mcp-server";
import type { HonoContextWithAuth } from "@server/types/hono";
import {
	type AppMCPServer,
	createMcpServerSchema,
	type MCPTransport,
} from "@shared/types/mcp";
import { Hono } from "hono";
import { z } from "zod";

const mcpRouter = new Hono<HonoContextWithAuth>()
	// GET all servers (custom + default)
	.get("/servers", async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const { activeOrganizationId } = c.get("session");

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		const customServers = await organizationDo.getMcpServers();
		const customServersWithType = customServers.map((server) => ({
			...server,
			type: "custom" as const,
		}));

		const allServers: AppMCPServer[] = [
			...defaultMcpServers,
			...customServersWithType,
		];

		return c.json(allServers);
	})
	// POST to create a new custom server
	.post("/servers", zValidator("json", createMcpServerSchema), async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const { activeOrganizationId } = c.get("session");
		const newServerData = c.req.valid("json");

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		const newServer = await organizationDo.createMcpServer({
			...newServerData,
			transport: newServerData.transport as MCPTransport,
		});
		return c.json(newServer, 201);
	})
	// PUT to update a server
	.put("/servers/:id", zValidator("json", createMcpServerSchema), async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const { activeOrganizationId } = c.get("session");
		const { id } = c.req.param();
		const serverData = c.req.valid("json");

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		const updatedServer = await organizationDo.updateMcpServer(id, {
			...serverData,
			transport: serverData.transport as MCPTransport,
		});
		return c.json(updatedServer);
	})
	// DELETE a server
	.delete("/servers/:id", async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const { activeOrganizationId } = c.get("session");
		const { id } = c.req.param();

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		await organizationDo.deleteMcpServer(id);
		return c.json({ success: true });
	})
	// POST to test a server's connection
	.post("/servers/:id/test", async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const { id } = c.req.param();
		const { activeOrganizationId } = c.get("session");

		// Check if it's a default server
		let server: AppMCPServer | undefined = defaultMcpServers.find(
			(s) => s.id === id,
		);

		// If not found in defaults, check custom servers
		if (!server) {
			const organizationDoId =
				ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
			const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);
			const customServers = await organizationDo.getMcpServers();
			const customServer = customServers.find((s) => s.id === id);
			if (customServer) {
				server = { ...customServer, type: "custom" as const };
			}
		}

		if (!server) {
			return c.json({ error: "Server not found" }, 404);
		}

		try {
			const tools = await fetchMCPServerTools(server);
			return c.json({
				success: !!tools,
				toolCount: tools ? Object.keys(tools).length : 0,
			});
		} catch (error) {
			return c.json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	})
	// GET tools from a specific server
	.get(
		"/:serverId/tools",
		zValidator(
			"param",
			z.object({
				serverId: z.string(),
			}),
		),
		async (c) => {
			const { ORGANIZATION_DURABLE_OBJECT } = c.env;
			const { serverId } = c.req.valid("param");
			const { activeOrganizationId } = c.get("session");

			// Check if it's a default server
			let server: AppMCPServer | undefined = defaultMcpServers.find(
				(s) => s.id === serverId,
			);

			// If not found in defaults, check custom servers
			if (!server) {
				const organizationDoId =
					ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
				const organizationDo =
					ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);
				const customServers = await organizationDo.getMcpServers();
				const customServer = customServers.find((s) => s.id === serverId);
				if (customServer) {
					server = { ...customServer, type: "custom" as const };
				}
			}

			if (!server) {
				return c.json({ error: "MCP Server not found" }, 404);
			}

			const tools = await fetchMCPServerTools(server);

			if (!tools) {
				return c.json({ error: "Failed to fetch tools from MCP server" }, 500);
			}

			return c.json(tools);
		},
	);

export default mcpRouter;
