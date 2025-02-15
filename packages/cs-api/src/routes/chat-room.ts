import { Hono } from "hono";
import { z } from "zod";

import type { HonoVariables } from "../types/hono";
import { schema as d1Schema } from "@/cs-shared";
import { zValidator } from "@hono/zod-validator";

// Validation schemas
/* const paramsSchema = z.object({
	roomId: z.string().min(1),
}); */

const app = new Hono<HonoVariables>()
	.post(
		"/create",
		zValidator(
			"json",
			z.object({
				name: z.string().min(1),
				isPrivate: z.boolean().optional(),
			}),
		),
		async (c) => {
			const { CHAT_DURABLE_OBJECT } = c.env;
			const db = c.get("db");
			const user = c.get("user");
			const session = c.get("session");
			const { activeOrganizationId } = session;
			const { name, isPrivate } = c.req.valid("json");

			if (!activeOrganizationId) {
				throw new Error("Organization not set");
			}

			// Create durable object
			const id = CHAT_DURABLE_OBJECT.newUniqueId();
			const chatRoom = CHAT_DURABLE_OBJECT.get(id);

			await chatRoom.migrate();
			await chatRoom.addMember(user.id, "admin");

			// Create room record in D1
			await db.insert(d1Schema.chatRoom).values({
				id: id.toString(),
				name,
				organizationId: activeOrganizationId,
				isPrivate: isPrivate ?? false,
			});

			await db.insert(d1Schema.chatRoomMember).values({
				roomId: id.toString(),
				userId: user.id,
			});

			return c.json({ roomId: id.toString() });
		},
	)
	.get("/", async (c) => {
		const db = c.get("db");
		const session = c.get("session");
		const user = c.get("user");
		const { activeOrganizationId } = session;

		if (!activeOrganizationId) {
			throw new Error("Organization not set");
		}

		const userMemberRooms = await db.query.chatRoomMember.findMany({
			where: (members, { eq }) => eq(members.userId, user.id),
			with: {
				room: {
					with: {
						members: {
							with: {
								user: true,
							},
						},
					},
				},
			},
		});

		const rooms = userMemberRooms.map((member) => member.room);

		return c.json(rooms);
	})
	.get(
		"/:roomId/websocket",
		zValidator(
			"param",
			z.object({
				roomId: z.string().min(1),
			}),
		),
		async (c) => {
			const user = c.get("user");
			const { roomId } = c.req.valid("param");
			const db = c.get("db");

			// Verify organization membership through D1
			const roomMember = await db.query.chatRoomMember.findFirst({
				where: (members, { eq, and }) =>
					and(eq(members.userId, user.id), eq(members.roomId, roomId)),
				with: {
					room: true,
				},
			});

			if (!roomMember) {
				throw new Error("Not authorized");
			}

			// Proceed with WebSocket connection
			const id = c.env.CHAT_DURABLE_OBJECT.idFromString(roomMember.room.id);
			const stub = c.env.CHAT_DURABLE_OBJECT.get(id);
			return stub.fetch(c.req.url, c.req);
		},
	);

export default app;
