import { tool } from "ai";
import { z } from "zod";

export const createMessageThreadTool = () =>
	tool({
		description:
			"Use this tool to create a new message thread if we are not already responding in a thread (threadId is null).",
		inputSchema: z.object({
			message: z.string().describe("The message to include in the thread"),
		}),
		outputSchema: z.object({
			success: z.literal(true),
		}),
		execute: async () => {
			return {
				success: true,
			};
		},
	});
