import type { ChatRoomDbServices } from "@server/organization-do/db/services";

import { tool } from "ai";
import { z } from "zod";

const createDocumentInputSchema = z.object({
	title: z
		.string()
		.min(1)
		.describe("A concise, descriptive title for the document."),
	content: z
		.string()
		.min(1)
		.describe("The full markdown content for the document."),
});

export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>;

const createDocumentOutputSchema = z
	.object({
		success: z.literal(true),
		documentId: z.string(),
		title: z.string(),
	})
	.or(
		z.object({
			success: z.literal(false),
			error: z.string(),
		}),
	);

export type CreateDocumentOutput = z.infer<typeof createDocumentOutputSchema>;

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
		inputSchema: createDocumentInputSchema,
		outputSchema: createDocumentOutputSchema,
		execute: async ({ title, content }): Promise<CreateDocumentOutput> => {
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
