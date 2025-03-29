import { Hono } from "hono";

import {
	type ChatRoom,
	type ChatRoomMember,
	chatRoomMemberHasChatRoomPermission,
	createChatRoomSchema,
	dbServices,
	globalSchema,
} from "@/cs-shared";
import { zValidator } from "@hono/zod-validator";
import { eq, inArray } from "drizzle-orm";
import type { HonoContextWithAuth } from "../../../types/hono";

const chatRoom = new Hono<HonoContextWithAuth>()
	.post("/", zValidator("json", createChatRoomSchema), async (c) => {
		const { CHAT_DURABLE_OBJECT } = c.env;
		const db = c.get("db");
		const user = c.get("user");
		const session = c.get("session");
		const { activeOrganizationId } = session;
		const { name, type, members } = c.req.valid("json");

		const hasChatRoomPermission = await chatRoomMemberHasChatRoomPermission({
			headers: c.req.raw.headers,
			db,
			auth: c.get("auth"),
			params: {
				permission: "create",
			},
		});

		if (!hasChatRoomPermission) {
			// TODO Improve error handling, add middleware to handle errors and check if throwing an error or returning a 401 is the best approach
			// NOTE: Also, check that we are correcttly showing some error message on the client side
			throw new Error("Unauthorized");
		}

		// Prepare members

		const newMembersWithoutCurrentUser = members.filter(
			(member) => member.id !== user.id,
		);

		const newUserMembers = newMembersWithoutCurrentUser.filter(
			(member) => member.type === "user",
		);

		const newAgentMembers = newMembersWithoutCurrentUser.filter(
			(member) => member.type === "agent",
		);

		const [newUserMemberDetails, newAgentMemberDetails] = await Promise.all([
			db
				.select()
				.from(globalSchema.user)
				.where(
					inArray(
						globalSchema.user.id,
						newUserMembers.map((member) => member.id),
					),
				),
			db
				.select()
				.from(globalSchema.agent)
				.where(
					inArray(
						globalSchema.agent.id,
						newAgentMembers.map((member) => member.id),
					),
				),
		]);

		const membersToAddDetailsPartial = [
			...newUserMemberDetails.map((member) => ({
				id: member.id,
				name: member.name,
				email: member.email,
				image: member.image,
				//roomId: newChatRoom.id,
				role: "member" as const,
				type: "user" as const,
			})),
			...newAgentMemberDetails.map((member) => ({
				id: member.id,
				name: member.name,
				email: `agent-${member.name}@${member.organizationId}.com`,
				image: member.image,
				//roomId: newChatRoom.id,
				role: "member" as const,
				type: "agent" as const,
			})),
		];

		if (type === "oneToOne" && membersToAddDetailsPartial.length !== 1) {
			throw new Error("One to one chat rooms must have exactly one member");
		}

		// Create Chat Room

		const chatRoomDoId = CHAT_DURABLE_OBJECT.newUniqueId();
		const chatRoomDo = CHAT_DURABLE_OBJECT.get(chatRoomDoId);

		await chatRoomDo.migrate();

		const newChatRoom: ChatRoom = {
			id: chatRoomDoId.toString(),
			name: type === "oneToOne" ? membersToAddDetailsPartial[0].name : name,
			organizationId: activeOrganizationId,
			type,
			createdAt: Date.now(),
		};

		await chatRoomDo.upsertConfig(newChatRoom);
		await db.insert(globalSchema.chatRoom).values(newChatRoom);

		// Create owner member

		const newOwnerChatRoomMember: ChatRoomMember = {
			id: user.id,
			roomId: newChatRoom.id,
			role: "owner",
			type: "user",
			name: user.name,
			email: user.email,
			image: user.image,
		};

		await chatRoomDo.addMembers([newOwnerChatRoomMember]);

		await db.insert(globalSchema.chatRoomMember).values({
			roomId: newChatRoom.id,
			memberId: newOwnerChatRoomMember.id,
			role: newOwnerChatRoomMember.role,
			type: newOwnerChatRoomMember.type,
		});

		// TODO: Apply transactions or someway to rollback if one of the operations fails for this and other operations

		// Create other members

		const membersToAddDetails = membersToAddDetailsPartial.map((member) => ({
			...member,
			roomId: newChatRoom.id,
		}));

		if (membersToAddDetails.length > 0) {
			await db.insert(globalSchema.chatRoomMember).values(
				membersToAddDetails.map((member) => ({
					memberId: member.id,
					roomId: newChatRoom.id,
					role: member.role,
					type: member.type,
				})),
			);
			await chatRoomDo.addMembers(membersToAddDetails);
		}

		return c.json({ roomId: chatRoomDoId.toString() });
	})
	.get("/", async (c) => {
		const db = c.get("db");
		const user = c.get("user");

		const userMemberRooms = await db
			.select({
				room: globalSchema.chatRoom,
			})
			.from(globalSchema.chatRoomMember)
			.innerJoin(
				globalSchema.chatRoom,
				eq(globalSchema.chatRoomMember.roomId, globalSchema.chatRoom.id),
			)
			.where(eq(globalSchema.chatRoomMember.memberId, user.id));

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

		const chatRoom = await dbServices.room.getChatRoom(db, {
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
			.delete(globalSchema.chatRoom)
			.where(eq(globalSchema.chatRoom.id, chatRoom.id));

		await db
			.delete(globalSchema.chatRoomMember)
			.where(eq(globalSchema.chatRoomMember.roomId, chatRoom.id));

		const chatRoomDoId = c.env.CHAT_DURABLE_OBJECT.idFromString(chatRoom.id);
		const chatRoomDo = c.env.CHAT_DURABLE_OBJECT.get(chatRoomDoId);

		await chatRoomDo.delete();

		return c.json({
			success: true,
		});
	});

export default chatRoom;
