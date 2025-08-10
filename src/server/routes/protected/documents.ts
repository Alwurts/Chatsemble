import type { HonoContextWithAuth } from "@server/types/hono";
import { Hono } from "hono";

const app = new Hono<HonoContextWithAuth>().delete(
	"/:documentId",
	async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const documentId = c.req.param("documentId");
		const session = c.get("session");
		const { activeOrganizationId } = session;

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		await organizationDo.deleteDocument(documentId);

		return c.json({
			success: true,
		});
	},
);

export default app;
