import type { ChatRoomDbServices } from "@server/organization-do/db/services";

import { tool } from "ai";
import { z } from "zod";

const createDocumentArgsSchema = z.object({
	title: z
		.string()
		.min(1)
		.describe("A concise, descriptive title for the document."),
	content: z
		.string()
		.min(1)
		.describe("The full markdown content for the document."),
});

export type CreateDocumentArgs = z.infer<typeof createDocumentArgsSchema>;

export type CreateDocumentResult =
	| { success: true; documentId: string; title: string }
	| { success: false; error: string };

export const createDocumentTool = ({
	createDocument,
	roomId,
	agentId,
}: {
	createDocument: ChatRoomDbServices["createDocument"];
	roomId: string;
	agentId: string;
}) =>
	tool({
		description: `Creates a persistent markdown document. Use this to save summaries, reports, search results, or other generated content.
			The content of the document should be in markdown format.
			The content of the document should not include any extra questions or instructions that are meant for the user, instead it should be a clear professional document that outlines the information you have found.
			`,
		parameters: createDocumentArgsSchema,
		execute: async ({ title, content }): Promise<CreateDocumentResult> => {
			try {
				const newDocument = await createDocument({
					roomId,
					title,
					content,
					createdByMemberId: agentId,
					createdByMemberType: "agent",
				});
				console.log(`[createDocumentTool] Document created: ${newDocument.id}`);
				return {
					success: true,
					documentId: newDocument.id,
					title: newDocument.title,
				};
			} catch (error) {
				console.error("[createDocumentTool] Error:", error);
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return {
					success: false,
					error: `Failed to create document: ${message}`,
				};
			}
		},
	});
