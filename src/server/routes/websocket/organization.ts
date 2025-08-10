import {
	honoAuthCheckMiddleware,
	honoAuthMiddleware,
} from "@server/middleware/auth";
import type { HonoContextWithAuth } from "@server/types/hono";
import { Hono } from "hono";

const app = new Hono<HonoContextWithAuth>()
	.use(honoAuthMiddleware)
	.use(honoAuthCheckMiddleware)
	.get("/organization/:organizationSlug", async (c) => {
		const upgradeHeader = c.req.header("Upgrade");
		if (!upgradeHeader || upgradeHeader !== "websocket") {
			return c.text("Expected Upgrade: websocket", 426);
		}

		const user = c.get("user");

		const { organizationSlug } = c.req.param();

		// Proceed with WebSocket connection
		const organizationDoId =
			c.env.ORGANIZATION_DURABLE_OBJECT.idFromName(organizationSlug);
		const organizationDo =
			c.env.ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		const url = new URL(c.req.url);
		url.searchParams.set("userId", user.id);

		return await organizationDo.fetch(new Request(url, c.req.raw));
	});

export default app;
