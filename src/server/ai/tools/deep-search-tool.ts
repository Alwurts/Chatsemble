import { env } from "cloudflare:workers";
import type { AgentToolAnnotation, ToolSource } from "@shared/types";
import { type UIMessageStreamWriter, tool } from "ai";
import FirecrawlApp from "firecrawl";
import { nanoid } from "nanoid";
import { z } from "zod";

const deepResearchInputSchema = z.object({
	query: z.string().describe("The specific query for deep research."),
});

const deepResearchOutputSchema = z
	.object({
		sources: z.array(
			z.object({
				url: z.string(),
				title: z.string(),
				description: z.string().optional(),
				icon: z.string().optional(),
			}),
		),
		finalAnalysis: z.string(),
	})
	.or(
		z.object({
			success: z.literal(false),
			error: z.string(),
		}),
	);

export type DeepResearchOutput = z.infer<typeof deepResearchOutputSchema>;

export const deepResearchTool = (dataStream: UIMessageStreamWriter) =>
	tool({
		description:
			"Deeply research a topic when user asks for detailed information, opinions, comprehensive analysis, or when webSearchTool is insufficient. Use specific queries.",
		inputSchema: deepResearchInputSchema,
		outputSchema: deepResearchOutputSchema,
		execute: async ({ query }, { toolCallId }): Promise<DeepResearchOutput> => {
			try {
				console.log("[deepResearchTool] Starting deep research for:", query);

				const firecrawl = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

				const result = await firecrawl.deepResearch(
					query,
					{
						maxDepth: 1, // Number of research iterations
						timeLimit: 40, // Time limit in seconds
						maxUrls: 2, // Maximum URLs to analyze
					},
					({ type, message, depth, status, timestamp }) => {
						const annotation = {
							toolCallId,
							id: nanoid(),
							type: type,
							message: message,
							status: status as "processing" | "complete" | "failed",
							data: {
								depth,
								status,
								timestamp,
							},
							timestamp: Date.now(),
						} satisfies AgentToolAnnotation;
						dataStream.write({
							type: "data-message-annotation",
							data: annotation,
						});
					},
				);

				if (result.success) {
					const { finalAnalysis, sources } = result.data;
					const processedSources: ToolSource[] = sources.map(
						(s: {
							url: string;
							title: string;
							description: string;
							icon?: string;
						}) => ({
							type: "url",
							url: s.url,
							title: s.title,
							content: s.description,
							icon: s.icon && s.icon.trim().length > 0 ? s.icon : undefined,
						}),
					);
					console.log("[deepResearchTool] Finished deep research.");
					return {
						sources: processedSources,
						finalAnalysis,
					};
				}

				console.error("[deepResearchTool] Failed to perform deep research.");

				return { sources: [], finalAnalysis: "" };
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				const errorAnnotation = {
					toolCallId,
					id: nanoid(),
					type: "deep_research_error",
					message: `Deep research failed: ${errorMessage}`,
					status: "failed",
					timestamp: Date.now(),
				} satisfies AgentToolAnnotation;
				dataStream.write({
					type: "data-message-annotation",
					data: errorAnnotation,
				});
				return { sources: [], finalAnalysis: "", error: errorMessage };
			}
		},
	});
