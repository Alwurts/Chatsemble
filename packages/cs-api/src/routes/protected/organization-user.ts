import { Hono } from "hono";
import { schema as d1Schema } from "@/cs-shared";
import { eq } from "drizzle-orm";
import type { HonoVariables } from "../../types/hono";

const app = new Hono<HonoVariables>().get("/", async (c) => {
	const db = c.get("db");
	const session = c.get("session");
	const { activeOrganizationId } = session;

	if (!activeOrganizationId) {
		throw new Error("Organization not set");
	}

	const users = await db
		.select({
			id: d1Schema.user.id,
			name: d1Schema.user.name,
			email: d1Schema.user.email,
			image: d1Schema.user.image,
		})
		.from(d1Schema.member)
		.innerJoin(d1Schema.user, eq(d1Schema.member.userId, d1Schema.user.id))
		.where(eq(d1Schema.member.organizationId, activeOrganizationId));

	return c.json(users);
});

export default app;
