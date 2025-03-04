import { getChatRoomMember } from "@/cs-shared";
import { Hono } from "hono";
import {
	honoAuthCheckMiddleware,
	honoAuthMiddleware,
	honoDbMiddleware,
} from "../lib/hono/middleware";
import type { HonoContextWithAuth } from "../types/hono";

const app = new Hono<HonoContextWithAuth>()
	.use(honoDbMiddleware)
	.use(honoAuthMiddleware)
	.use(honoAuthCheckMiddleware)
	.get("/chat-room/:chatRoomId", async (c) => {
		const upgradeHeader = c.req.header("Upgrade");
		if (!upgradeHeader || upgradeHeader !== "websocket") {
			return c.text("Expected Upgrade: websocket", 426);
		}

		const user = c.get("user");

		const { chatRoomId } = c.req.param();
		const db = c.get("db");

		const roomMember = await getChatRoomMember(db, {
			chatRoomId,
			memberId: user.id,
		});

		// TODO: Check org permissions to allow admins and owners to connect to any chat room

		if (!roomMember) {
			throw new Error("Not authorized");
		}

		// Proceed with WebSocket connection
		const id = c.env.CHAT_DURABLE_OBJECT.idFromString(roomMember.roomId);
		const stub = c.env.CHAT_DURABLE_OBJECT.get(id);

		const url = new URL(c.req.url);
		url.searchParams.set("userId", user.id);

		return await stub.fetch(new Request(url, c.req.raw));
	});

export default app;
