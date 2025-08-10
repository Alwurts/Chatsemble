import type { ChatRoomMessage } from "@shared/types";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { chatMessage, chatRoomMember } from "../schema";

export function createChatRoomMessageService(db: DrizzleSqliteDODatabase) {
	/**
	 * Get all messages for a chat room
	 * @param options - The options for the query
	 * @returns The messages for the chat room
	 */
	async function getChatRoomMessages(options: {
		roomId: string;
		threadId?: number | null;
		limit?: number;
		afterId?: number;
		beforeId?: number;
	}): Promise<ChatRoomMessage[]> {
		const query = db
			.select({
				id: chatMessage.id,
				parts: chatMessage.parts,
				mentions: chatMessage.mentions,
				status: chatMessage.status,
				memberId: chatMessage.memberId,
				createdAt: chatMessage.createdAt,
				metadata: chatMessage.metadata,
				threadId: chatMessage.threadId,
				roomId: chatMessage.roomId,
				threadMetadata: chatMessage.threadMetadata,
				member: {
					id: chatRoomMember.id,
					roomId: chatRoomMember.roomId,
					role: chatRoomMember.role,
					type: chatRoomMember.type,
					name: chatRoomMember.name,
					email: chatRoomMember.email,
					image: chatRoomMember.image,
				},
			})
			.from(chatMessage)
			.innerJoin(
				chatRoomMember,
				and(
					eq(chatMessage.memberId, chatRoomMember.id),
					eq(chatMessage.roomId, chatRoomMember.roomId),
				),
			)
			.orderBy(desc(chatMessage.id));

		const conditions = [eq(chatMessage.roomId, options.roomId)];

		if (options.threadId === null) {
			conditions.push(isNull(chatMessage.threadId));
		} else if (options.threadId && typeof options.threadId === "number") {
			conditions.push(eq(chatMessage.threadId, options.threadId));
		}

		if (options.afterId) {
			conditions.push(gt(chatMessage.id, options.afterId));
		}

		if (options.beforeId) {
			conditions.push(lt(chatMessage.id, options.beforeId));
		}

		if (conditions.length > 0) {
			query.where(and(...conditions));
		}

		if (options.limit) {
			query.limit(options.limit);
		}

		const result = await query;
		return result.reverse();
	}

	async function insertChatRoomMessage(
		message: typeof chatMessage.$inferInsert,
	): Promise<ChatRoomMessage> {
		const [insertedMessage] = await db
			.insert(chatMessage)
			.values(message)
			.returning();

		if (!insertedMessage) {
			throw new Error("Failed to insert message");
		}

		const messageWithMember = await getChatRoomMessageById(insertedMessage.id);

		if (!messageWithMember) {
			throw new Error("Failed to fetch message with user data");
		}

		return messageWithMember;
	}

	async function updateChatRoomMessage(
		id: number,
		{
			...message
		}: Omit<
			typeof chatMessage.$inferSelect,
			| "id"
			| "createdAt"
			| "memberId"
			| "metadata"
			| "threadId"
			| "roomId"
			| "threadMetadata"
		>,
	): Promise<ChatRoomMessage> {
		const [updatedMessage] = await db
			.update(chatMessage)
			.set(message)
			.where(eq(chatMessage.id, id))
			.returning();

		if (!updatedMessage) {
			throw new Error("Failed to update message");
		}

		const messageWithMember = await getChatRoomMessageById(updatedMessage.id);

		if (!messageWithMember) {
			throw new Error("Failed to fetch message with user data");
		}

		return messageWithMember;
	}

	async function getChatRoomMessageById(
		id: number,
	): Promise<ChatRoomMessage | undefined> {
		return await db
			.select({
				id: chatMessage.id,
				parts: chatMessage.parts,
				mentions: chatMessage.mentions,
				status: chatMessage.status,
				memberId: chatMessage.memberId,
				createdAt: chatMessage.createdAt,
				metadata: chatMessage.metadata,
				threadId: chatMessage.threadId,
				roomId: chatMessage.roomId,
				threadMetadata: chatMessage.threadMetadata,
				member: {
					id: chatRoomMember.id,
					roomId: chatRoomMember.roomId,
					role: chatRoomMember.role,
					type: chatRoomMember.type,
					name: chatRoomMember.name,
					email: chatRoomMember.email,
					image: chatRoomMember.image,
				},
			})
			.from(chatMessage)
			.innerJoin(
				chatRoomMember,
				and(
					eq(chatMessage.memberId, chatRoomMember.id),
					eq(chatMessage.roomId, chatRoomMember.roomId),
				),
			)
			.where(eq(chatMessage.id, id))
			.get();
	}

	async function updateChatRoomMessageThreadMetadata(
		id: number,
		newMessage: ChatRoomMessage,
	) {
		const currentMessage = await getChatRoomMessageById(id);

		if (!currentMessage) {
			throw new Error("Message not found");
		}

		const messageCount = currentMessage.threadMetadata?.messageCount ?? 0;

		await db
			.update(chatMessage)
			.set({
				threadMetadata: {
					lastMessage: newMessage,
					messageCount: messageCount + 1,
				},
			})
			.where(eq(chatMessage.id, id));

		const updatedMessage = await getChatRoomMessageById(id);

		if (!updatedMessage) {
			throw new Error("Failed to fetch updated message");
		}

		return updatedMessage;
	}

	return {
		getChatRoomMessages,
		updateChatRoomMessage,
		getChatRoomMessageById,
		insertChatRoomMessage,
		updateChatRoomMessageThreadMetadata,
	};
}
