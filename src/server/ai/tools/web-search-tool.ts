import { env } from "cloudflare:workers";
import type { AgentToolAnnotation, ToolSource } from "@shared/types";
import { type UIMessageStreamWriter, tool } from "ai";
import { nanoid } from "nanoid";
import { z } from "zod";

const webSearchInputSchema = z.object({
	query: z.string().describe("The search query"),
});

const webSearchOutputSchema = z
	.object({
		sources: z.array(
			z.object({
				url: z.string(),
				title: z.string(),
				description: z.string().optional(),
				icon: z.string().optional(),
			}),
		),
	})
	.or(
		z.object({
			success: z.literal(false),
			error: z.string(),
		}),
	);

export type WebSearchOutput = z.infer<typeof webSearchOutputSchema>;

export const webSearchTool = (dataStream: UIMessageStreamWriter) =>
	tool({
		description:
			"Use this tool when the user asks you to search for any kind of information or requires more information about a topic",
		inputSchema: webSearchInputSchema,
		outputSchema: webSearchOutputSchema,
		execute: async ({ query }, { toolCallId }): Promise<WebSearchOutput> => {
			try {
				// Step 1: Send "starting search" annotation
				const startAnnotation = {
					toolCallId,
					id: nanoid(),
					type: "search_started",
					message: `Starting search for: ${query}`,
					data: {},
					status: "processing",
					timestamp: Date.now(),
				} satisfies AgentToolAnnotation;
				dataStream.write({
					type: "data-message-annotation",
					data: startAnnotation,
				});

				// Step 2: Perform the search
				const searchParams = new URLSearchParams({ q: query });
				const response = await fetch(
					`https://api.search.brave.com/res/v1/web/search?${searchParams}`,
					{
						headers: {
							Accept: "application/json",
							"Accept-Encoding": "gzip",
							"X-Subscription-Token": env.BRAVE_API_KEY,
						},
					},
				);

				if (!response.ok) {
					throw new Error(`Brave API error: ${response.statusText}`);
				}

				const data = (await response.json()) as {
					web: {
						results: {
							title: string;
							url: string;
							description: string;
							extra_snippets: string[];
						}[];
					};
				};
				const results = data.web?.results || [];

				// Step 3: Process results into structured format
				const processedResults: ToolSource[] = results.map(
					(r: {
						title: string;
						url: string;
						description: string;
						extra_snippets: string[];
					}) => {
						const content = [r.description, ...(r.extra_snippets || [])].join(
							"\n",
						);
						return {
							type: "url",
							url: r.url,
							title: r.title,
							content,
						};
					},
				);

				// Step 4: Send "finalized search" annotation
				const endAnnotation = {
					toolCallId,
					id: nanoid(),
					type: "search_finalized",
					message: `Search completed, found ${results.length} results`,
					data: { totalResults: results.length },
					status: "complete",
					timestamp: Date.now(),
				} satisfies AgentToolAnnotation;

				dataStream.write({
					type: "data-message-annotation",
					data: endAnnotation,
				});

				// Step 5: Return the structured results
				return { sources: processedResults };
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				const errorAnnotation = {
					toolCallId,
					id: nanoid(),
					type: "search_error",
					message: `Search failed: ${errorMessage}`,
					status: "failed",
					timestamp: Date.now(),
				} satisfies AgentToolAnnotation;
				dataStream.write({
					type: "data-message-annotation",
					data: errorAnnotation,
				});
				return { sources: [], error: errorMessage };
			}
		},
	});
