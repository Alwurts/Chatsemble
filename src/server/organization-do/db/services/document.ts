import type { Document } from "@shared/types";
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
	};
}
