import { eq } from "drizzle-orm";
// packages/cs-api/src/durable-objects/agent/db/agentChatRoomOperations.ts
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { agentChatRoom } from "../schema";

export function createAgentChatRoomService(db: DrizzleSqliteDODatabase) {
	return {
		async getChatRooms() {
			return db.select().from(agentChatRoom).all();
		},

		async getChatRoom(id: string) {
			const chatRoom = await db
				.select()
				.from(agentChatRoom)
				.where(eq(agentChatRoom.id, id))
				.get();
			if (!chatRoom) {
				throw new Error("Chat room not found");
			}
			return chatRoom;
		},

		async addChatRoom(chatRoom: typeof agentChatRoom.$inferInsert) {
			await db
				.insert(agentChatRoom)
				.values(chatRoom)
				.onConflictDoUpdate({
					target: [agentChatRoom.id],
					set: { name: chatRoom.name },
				});
		},

		async deleteChatRoom(id: string) {
			await db.delete(agentChatRoom).where(eq(agentChatRoom.id, id));
		},
	};
}
