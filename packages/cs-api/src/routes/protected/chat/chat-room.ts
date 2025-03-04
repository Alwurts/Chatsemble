import { Hono } from "hono";

import {
	type ChatRoom,
	type ChatRoomMember,
	chatRoomMemberHasChatRoomPermission,
	createChatRoomSchema,
	schema as d1Schema,
	getChatRoom,
} from "@/cs-shared";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { HonoContextWithAuth } from "../../../types/hono";

const chatRoom = new Hono<HonoContextWithAuth>()
	.post("/create", zValidator("json", createChatRoomSchema), async (c) => {
		const { CHAT_DURABLE_OBJECT } = c.env;
		const db = c.get("db");
		const user = c.get("user");
		const session = c.get("session");
		const { activeOrganizationId } = session;
		const { name, type } = c.req.valid("json");

		const hasChatRoomPermission = await chatRoomMemberHasChatRoomPermission({
			headers: c.req.raw.headers,
			db,
			auth: c.get("auth"),
			params: {
				permission: "create",
			},
		});

		if (!hasChatRoomPermission) {
			throw new Error("Unauthorized");
		}

		// Create durable object
		const chatRoomDoId = CHAT_DURABLE_OBJECT.newUniqueId();
		const chatRoomDo = CHAT_DURABLE_OBJECT.get(chatRoomDoId);

		await chatRoomDo.migrate();

		const newChatRoom: ChatRoom = {
			id: chatRoomDoId.toString(),
			name,
			organizationId: activeOrganizationId,
			type,
			createdAt: Date.now(),
		};

		const newChatRoomMember: ChatRoomMember = {
			id: user.id,
			roomId: newChatRoom.id,
			role: "owner",
			type: "user",
			name: user.name,
			email: user.email,
			image: user.image,
		};

		await chatRoomDo.upsertChatRoomConfig(newChatRoom);
		await chatRoomDo.addMember(newChatRoomMember);

		// Create room record in D1
		await db.insert(d1Schema.chatRoom).values(newChatRoom);

		await db.insert(d1Schema.chatRoomMember).values({
			roomId: newChatRoom.id,
			memberId: newChatRoomMember.id,
			role: newChatRoomMember.role,
			type: newChatRoomMember.type,
		});

		return c.json({ roomId: chatRoomDoId.toString() });
	})
	.get("/", async (c) => {
		const db = c.get("db");
		const user = c.get("user");

		const userMemberRooms = await db
			.select({
				room: d1Schema.chatRoom,
			})
			.from(d1Schema.chatRoomMember)
			.innerJoin(
				d1Schema.chatRoom,
				eq(d1Schema.chatRoomMember.roomId, d1Schema.chatRoom.id),
			)
			.where(eq(d1Schema.chatRoomMember.memberId, user.id));

		const rooms: ChatRoom[] = userMemberRooms.map((member) => member.room);

		return c.json(rooms);
	})
	.delete("/:chatRoomId", async (c) => {
		const db = c.get("db");
		const user = c.get("user");
		const chatRoomId = c.req.param("chatRoomId");
		if (!chatRoomId) {
			throw new Error("Chat room ID is required");
		}

		const chatRoom = await getChatRoom(db, {
			chatRoomId,
			organizationId: c.get("session").activeOrganizationId,
		});

		if (!chatRoom) {
			throw new Error("Chat room not found");
		}

		const hasChatRoomPermission = await chatRoomMemberHasChatRoomPermission({
			headers: c.req.raw.headers,
			db,
			auth: c.get("auth"),
			params: {
				permission: "create",
				checkMemberPermission: {
					userId: user.id,
					chatRoomId,
					chatRoomType: chatRoom.type,
				},
			},
		});

		if (!hasChatRoomPermission) {
			throw new Error("Unauthorized");
		}

		await db
			.delete(d1Schema.chatRoom)
			.where(eq(d1Schema.chatRoom.id, chatRoom.id));

		await db
			.delete(d1Schema.chatRoomMember)
			.where(eq(d1Schema.chatRoomMember.roomId, chatRoom.id));

		const chatRoomDoId = c.env.CHAT_DURABLE_OBJECT.idFromString(chatRoom.id);
		const chatRoomDo = c.env.CHAT_DURABLE_OBJECT.get(chatRoomDoId);
		const members = await chatRoomDo.getMembers();
		const agentMembers = members.filter((member) => member.type === "agent");

		for (const member of agentMembers) {
			const agentDoId = c.env.AGENT_DURABLE_OBJECT.idFromString(member.id);
			const agentDo = c.env.AGENT_DURABLE_OBJECT.get(agentDoId);
			await agentDo.deleteChatRoom(chatRoom.id);
		}

		await chatRoomDo.delete();

		return c.json({
			success: true,
		});
	});

export default chatRoom;
