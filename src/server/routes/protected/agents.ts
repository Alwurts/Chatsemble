import { zValidator } from "@hono/zod-validator";
import type { HonoContextWithAuth } from "@server/types/hono";
import type { Agent } from "@shared/types";
import { createAgentSchema } from "@shared/types";
import { Hono } from "hono";
import { nanoid } from "nanoid";

// TODO: Add permissions check to agents routes

const app = new Hono<HonoContextWithAuth>()
	.get("/", async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;

		const session = c.get("session");
		const { activeOrganizationId } = session;

		if (!activeOrganizationId) {
			throw new Error("Organization not set");
		}

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		const agents: Agent[] = await organizationDo.getAgents();

		return c.json(agents);
	})
	.post("/", zValidator("json", createAgentSchema), async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const session = c.get("session");
		const { activeOrganizationId } = session;
		const {
			name,
			image,
			description,
			tone,
			verbosity,
			emojiUsage,
			languageStyle,
		} = c.req.valid("json");

		if (!activeOrganizationId) {
			throw new Error("Organization not set");
		}

		// Create durable object
		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		const email = `${nanoid(10)}@chatsemble.com`;

		const agent = await organizationDo.createAgent({
			email,
			name,
			image,
			description,
			tone,
			verbosity,
			emojiUsage,
			languageStyle,
		});

		return c.json({ agentId: agent.id });
	})
	.get("/:id", async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const session = c.get("session");
		const { activeOrganizationId } = session;
		const { id } = c.req.param();

		if (!activeOrganizationId) {
			throw new Error("Organization not set");
		}

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		const agent = await organizationDo.getAgentById(id);

		if (!agent) {
			throw new Error("Agent not found");
		}

		return c.json(agent);
	})
	.put("/:id", zValidator("json", createAgentSchema), async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const session = c.get("session");
		const { activeOrganizationId } = session;
		const {
			name,
			image,
			description,
			tone,
			verbosity,
			emojiUsage,
			languageStyle,
		} = c.req.valid("json");
		const { id } = c.req.param();

		if (!activeOrganizationId) {
			throw new Error("Organization not set");
		}

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		const agent = await organizationDo.updateAgent(id, {
			name,
			image,
			description,
			tone,
			verbosity,
			emojiUsage,
			languageStyle,
		});

		return c.json(agent);
	});

export default app;
