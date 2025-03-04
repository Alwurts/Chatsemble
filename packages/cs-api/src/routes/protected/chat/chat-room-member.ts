import { Hono } from "hono";

import {
	createChatRoomMemberSchema,
	schema as d1Schema,
	getChatRoom,
} from "@/cs-shared";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import type { HonoContextWithAuth } from "../../../types/hono";
import { chatRoomMemberHasMemberPermission } from "@/cs-shared";

const app = new Hono<HonoContextWithAuth>().post(
	"/:chatRoomId/members",
	zValidator("json", createChatRoomMemberSchema),
	async (c) => {
		const { CHAT_DURABLE_OBJECT, AGENT_DURABLE_OBJECT } = c.env;
		const chatRoomId = c.req.param("chatRoomId");
		const db = c.get("db");
		const session = c.get("session");
		const { activeOrganizationId } = session;

		const { id, role, type } = c.req.valid("json");

		const chatRoom = await getChatRoom(db, {
			chatRoomId,
			organizationId: activeOrganizationId,
		});

		if (!chatRoom) {
			throw new Error("Chat room not found");
		}

		const hasChatRoomMemberPermission = await chatRoomMemberHasMemberPermission(
			{
				headers: c.req.raw.headers,
				db,
				auth: c.get("auth"),
				params: {
					userId: c.get("user").id,
					chatRoomId,
					chatRoomType: chatRoom.type,
					permission: "create",
				},
			},
		);

		if (!hasChatRoomMemberPermission) {
			throw new Error("Unauthorized");
		}

		const room = await db
			.select()
			.from(d1Schema.chatRoom)
			.where(
				and(
					eq(d1Schema.chatRoom.id, chatRoom.id),
					eq(d1Schema.chatRoom.organizationId, activeOrganizationId),
				),
			)
			.get();

		if (!room) {
			throw new Error("Room not found");
		}

		const chatRoomDoId = CHAT_DURABLE_OBJECT.idFromString(room.id);
		const chatRoomDo = CHAT_DURABLE_OBJECT.get(chatRoomDoId);

		let member: {
			memberId: string;
			name: string;
			email?: string;
			image: string | null;
		} | null = null;

		if (type === "user") {
			const result = await db
				.select({
					user: d1Schema.user,
				})
				.from(d1Schema.organizationMember)
				.innerJoin(
					d1Schema.user,
					eq(d1Schema.organizationMember.userId, d1Schema.user.id),
				)
				.where(
					and(
						eq(d1Schema.organizationMember.userId, id),
						eq(
							d1Schema.organizationMember.organizationId,
							activeOrganizationId,
						),
					),
				)
				.get();

			if (!result?.user) {
				throw new Error("User not found");
			}

			member = {
				memberId: result.user.id,
				name: result.user.name,
				email: result.user.email,
				image: result.user.image,
			};
		}

		if (type === "agent") {
			const agent = await db
				.select()
				.from(d1Schema.agent)
				.where(
					and(
						eq(d1Schema.agent.id, id),
						eq(d1Schema.agent.organizationId, activeOrganizationId),
					),
				)
				.get();

			if (!agent) {
				throw new Error("Agent not found");
			}

			member = {
				memberId: agent.id,
				name: agent.name,
				image: agent.image,
			};
		}

		if (!member) {
			throw new Error("Member not found");
		}

		await chatRoomDo.addMember({
			id: member.memberId,
			roomId: room.id,
			role,
			type,
			name: member.name,
			email: member.email ?? "agent@chatsemble.com",
			image: member.image,
		});

		const [newMember] = await db
			.insert(d1Schema.chatRoomMember)
			.values({
				memberId: member.memberId,
				roomId: room.id,
				role,
				type,
			})
			.returning();

		if (!newMember) {
			throw new Error("Failed to add member");
		}

		if (type === "agent") {
			const agentId = AGENT_DURABLE_OBJECT.idFromString(member.memberId);
			const agent = AGENT_DURABLE_OBJECT.get(agentId);

			await agent.addChatRoom({
				id: room.id,
				name: room.name,
				organizationId: activeOrganizationId,
			});
		}

		return c.json({ success: true });
	},
);

export default app;
