import type { Document } from "@shared/types";
import { eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { document } from "../schema";

export function createDocumentService(db: DrizzleSqliteDODatabase) {
	return {
		async createDocument(
			newDocumentData: typeof document.$inferInsert,
		): Promise<Document> {
			const newDocument = await db
				.insert(document)
				.values(newDocumentData)
				.returning()
				.get();

			if (!newDocument) {
				throw new Error("Failed to create document");
			}

			return newDocument;
		},

		getChatRoomDocuments: async (roomId: string) => {
			const documents = await db
				.select()
				.from(document)
				.where(eq(document.roomId, roomId));
			return documents;
		},

		deleteDocument: async (documentId: string) => {
			const deletedDocument = await db
				.delete(document)
				.where(eq(document.id, documentId))
				.returning()
				.get();

			if (!deletedDocument) {
				throw new Error("Failed to delete document");
			}
			return deletedDocument;
		},
	};
}
