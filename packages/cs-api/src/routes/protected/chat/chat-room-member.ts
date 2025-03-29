import { Hono } from "hono";

import {
	createChatRoomMemberSchema,
	dbServices,
	globalSchema,
} from "@/cs-shared";
import { chatRoomMemberHasMemberPermission } from "@/cs-shared";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import type { HonoContextWithAuth } from "../../../types/hono";

const app = new Hono<HonoContextWithAuth>()
	.post(
		"/:chatRoomId/members",
		zValidator("json", createChatRoomMemberSchema),
		async (c) => {
			const { CHAT_DURABLE_OBJECT } = c.env;
			const chatRoomId = c.req.param("chatRoomId");
			const db = c.get("db");
			const session = c.get("session");
			const { activeOrganizationId } = session;

			const { id, role, type } = c.req.valid("json");

			const chatRoom = await dbServices.room.getChatRoom(db, {
				chatRoomId,
				organizationId: activeOrganizationId,
			});

			if (!chatRoom) {
				throw new Error("Chat room not found");
			}

			const hasChatRoomMemberPermission =
				await chatRoomMemberHasMemberPermission({
					headers: c.req.raw.headers,
					db,
					auth: c.get("auth"),
					params: {
						userId: c.get("user").id,
						chatRoomId,
						chatRoomType: chatRoom.type,
						permission: "create",
					},
				});

			if (!hasChatRoomMemberPermission) {
				throw new Error("Unauthorized");
			}

			const room = await db
				.select()
				.from(globalSchema.chatRoom)
				.where(
					and(
						eq(globalSchema.chatRoom.id, chatRoom.id),
						eq(globalSchema.chatRoom.organizationId, activeOrganizationId),
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
				email: string;
				image: string | null;
			} | null = null;

			if (type === "user") {
				const result = await db
					.select({
						user: globalSchema.user,
					})
					.from(globalSchema.organizationMember)
					.innerJoin(
						globalSchema.user,
						eq(globalSchema.organizationMember.userId, globalSchema.user.id),
					)
					.where(
						and(
							eq(globalSchema.organizationMember.userId, id),
							eq(
								globalSchema.organizationMember.organizationId,
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
					.from(globalSchema.agent)
					.where(
						and(
							eq(globalSchema.agent.id, id),
							eq(globalSchema.agent.organizationId, activeOrganizationId),
						),
					)
					.get();

				if (!agent) {
					throw new Error("Agent not found");
				}

				member = {
					memberId: agent.id,
					name: agent.name,
					email: agent.email,
					image: agent.image,
				};
			}

			if (!member) {
				throw new Error("Member not found");
			}

			await chatRoomDo.addMembers([
				{
					id: member.memberId,
					roomId: room.id,
					role,
					type,
					name: member.name,
					email: member.email,
					image: member.image,
				},
			]);

			const [newMember] = await db
				.insert(globalSchema.chatRoomMember)
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

			return c.json({ success: true });
		},
	)
	.delete("/:chatRoomId/members/:memberId", async (c) => {
		const { CHAT_DURABLE_OBJECT } = c.env;
		const chatRoomId = c.req.param("chatRoomId");
		const memberId = c.req.param("memberId");
		const db = c.get("db");
		const session = c.get("session");
		const { activeOrganizationId } = session;
		const userId = c.get("user").id;

		// Get the chat room
		const chatRoom = await dbServices.room.getChatRoom(db, {
			chatRoomId,
			organizationId: activeOrganizationId,
		});

		if (!chatRoom) {
			throw new Error("Chat room not found");
		}

		// Check permissions
		const hasChatRoomMemberPermission = await chatRoomMemberHasMemberPermission(
			{
				headers: c.req.raw.headers,
				db,
				auth: c.get("auth"),
				params: {
					userId,
					chatRoomId,
					chatRoomType: chatRoom.type,
					permission: "delete",
				},
			},
		);

		if (!hasChatRoomMemberPermission) {
			throw new Error("Unauthorized");
		}

		// Get the member to be removed
		const member = await db
			.select()
			.from(globalSchema.chatRoomMember)
			.where(
				and(
					eq(globalSchema.chatRoomMember.memberId, memberId),
					eq(globalSchema.chatRoomMember.roomId, chatRoomId),
				),
			)
			.get();

		if (!member) {
			throw new Error("Member not found");
		}

		// Delete from database
		await db
			.delete(globalSchema.chatRoomMember)
			.where(
				and(
					eq(globalSchema.chatRoomMember.memberId, memberId),
					eq(globalSchema.chatRoomMember.roomId, chatRoomId),
				),
			);

		// Remove from chat room durable object
		const chatRoomDoId = CHAT_DURABLE_OBJECT.idFromString(chatRoomId);
		const chatRoomDo = CHAT_DURABLE_OBJECT.get(chatRoomDoId);
		await chatRoomDo.removeMembers([memberId]);

		return c.json({ success: true });
	});

export default app;
