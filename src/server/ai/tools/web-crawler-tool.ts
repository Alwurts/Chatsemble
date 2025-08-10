import { createGoogleGenerativeAI } from "@ai-sdk/google";
import FirecrawlApp, {
	type FirecrawlDocumentMetadata,
} from "@mendable/firecrawl-js";
import type { AgentToolAnnotation, ToolSource } from "@shared/types";
import { type UIMessageStreamWriter, generateObject, tool } from "ai";
import { env } from "cloudflare:workers";
import { nanoid } from "nanoid";
import { z } from "zod";

// Type Definitions
const crawlTaskSchema = z.object({
	taskId: z.string().describe("Unique identifier for this specific task."),
	startUrl: z.string().describe("The starting URL for the crawl operation."),
	parameters: z
		.object({
			depth: z.number().int().min(0).max(3).describe("Crawling depth."),
			maxPages: z
				.number()
				.int()
				.positive()
				.max(30)
				.describe("Maximum number of pages to retrieve."),
		})
		.describe("Parameters for the crawl task."),
});

interface PageData {
	markdown: string;
	metadata: FirecrawlDocumentMetadata;
}

interface CrawlResult {
	type: "crawl";
	taskId: string;
	startUrl: string;
	status: "completed" | "failed";
	data?: PageData[];
	error?: string;
}

const synthesizedResultSchema = z.object({
	title: z.string().describe("A concise title for the synthesized answer."),
	explanation: z
		.string()
		.describe("A detailed explanation answering the original query."),
	keyFindings: z
		.array(z.string())
		.describe("Bulleted list of the most important points."),
	interestingPoints: z
		.array(z.string())
		.optional()
		.describe("Additional interesting details."),
	limitations: z.string().describe("A statement on the answer’s limitations."),
});

type SynthesizedResult = z.infer<typeof synthesizedResultSchema>;

export const webCrawlerTool = (dataStream: UIMessageStreamWriter) =>
	tool({
		description: `Performs web crawling to answer a query using provided sources, synthesizing results and returning sources. Allows specifying crawl depth and max pages per source.
			- NEVER call this tool multiple times in a row. Only call it once, if there is multiple queries combine them into one so that you only call this tool once.`,
		inputSchema: z.object({
			query: z
				.string()
				.describe("The specific query requiring web information."),
			relevantSources: z
				.array(
					z.object({
						url: z.string().describe("The URL to crawl."),
						title: z.string().describe("The title of the source."),
						description: z
							.string()
							.optional()
							.describe("Description of the source."),
						depth: z
							.number()
							.int()
							.min(0)
							.max(3)
							.optional()
							.default(1)
							.describe(
								"Crawl depth (0 for just the URL, 1 for URL and direct links, etc.).",
							),
						maxPages: z
							.number()
							.int()
							.positive()
							.max(30)
							.optional()
							.default(10)
							.describe("Maximum pages to crawl."),
					}),
				)
				.min(1)
				.describe("List of web sources to crawl for the query."),
		}),
		execute: async (
			{ query, relevantSources },
			{ toolCallId },
		): Promise<{
			synthesizedAnswer?: SynthesizedResult;
			sources: ToolSource[];
			error?: string;
		}> => {
			const overallStartTime = Date.now();
			let errorMessage: string | undefined;

			console.log(
				"[web-crawler-tool] Starting web crawl for:",
				JSON.stringify({ query, relevantSources }, null, 2),
			);

			const startAnnotation = {
				toolCallId,
				id: nanoid(),
				type: "start",
				message: `Starting web crawl for: ${query}`,
				status: "processing",
				timestamp: Date.now(),
			} satisfies AgentToolAnnotation;
			dataStream.write({
				type: "data-message-annotation",
				data: startAnnotation,
			});

			const tasks = createTasks(relevantSources);
			const results = await executeTasks({
				tasks,
				dataStream,
				toolCallId,
			});

			const completedResults = filterCompletedResults(results);

			const hasSuccessfulData = Object.values(completedResults).length > 0;

			let synthesizedAnswer: SynthesizedResult | undefined;
			if (hasSuccessfulData) {
				const cleanedResults = cleanCrawlResults(completedResults);
				for (const result of Object.values(cleanedResults)) {
					console.log(
						"[web-crawler-tool] Crawl result:",
						JSON.stringify(result, null, 2),
					);
				}
				const synthesisResult = await synthesizeResults(
					query,
					cleanedResults,
					dataStream,
					toolCallId,
				);
				if (synthesisResult.error) {
					errorMessage = synthesisResult.error;
				} else {
					synthesizedAnswer = synthesisResult.answer;
				}
			} else {
				errorMessage = "No content retrieved to synthesize an answer.";
				const noDataAnnotation = {
					toolCallId,
					id: nanoid(),
					type: "synthesis",
					message: errorMessage,
					status: "failed",
					timestamp: Date.now(),
				} satisfies AgentToolAnnotation;
				dataStream.write({
					type: "data-message-annotation",
					data: noDataAnnotation,
				});
			}

			const sources = constructFinalSources(results);

			const overallDuration = Date.now() - overallStartTime;
			const status = errorMessage ? "failed" : "complete";
			const finalMessage = `Web crawl finished in ${(overallDuration / 1000).toFixed(2)}s. ${
				errorMessage
					? `Error: ${errorMessage}`
					: `Processed ${sources.length} sources.`
			}`;
			const finalAnnotation = {
				toolCallId,
				id: nanoid(),
				type: "finish",
				message: finalMessage,
				status: status,
				data: { durationMs: overallDuration, sourceCount: sources.length },
				timestamp: Date.now(),
			} satisfies AgentToolAnnotation;
			dataStream.write({
				type: "data-message-annotation",
				data: finalAnnotation,
			});

			return { synthesizedAnswer, sources, error: errorMessage };
		},
	});

// Helper Functions

/** Trims markdown content for previews */
function trimMarkdown(markdown: string | undefined, maxLength = 300): string {
	if (!markdown) {
		return "No content retrieved.";
	}
	if (markdown.length <= maxLength) {
		return markdown;
	}
	let trimmed = markdown.substring(0, maxLength);
	const lastSpace = trimmed.lastIndexOf(" ");
	if (lastSpace > 0) {
		trimmed = trimmed.substring(0, lastSpace);
	}
	return `${trimmed}...`;
}

/** Creates crawl tasks from relevant sources */
function createTasks(
	relevantSources: Array<{
		url: string;
		depth?: number;
		maxPages?: number;
	}>,
): Array<z.infer<typeof crawlTaskSchema>> {
	return relevantSources.map((source, index) => {
		const taskId = `task-${String(index + 1).padStart(3, "0")}`;
		return {
			taskId,
			startUrl: source.url,
			parameters: {
				depth: source.depth ?? 1,
				maxPages: source.maxPages ?? 10,
			},
		};
	});
}

/** Executes crawl tasks and collects results */
async function executeTasks({
	tasks,
	dataStream,
	toolCallId,
}: {
	tasks: Array<z.infer<typeof crawlTaskSchema>>;
	dataStream: UIMessageStreamWriter;
	toolCallId: string;
}): Promise<Record<string, CrawlResult>> {
	const app = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

	const results: Record<string, CrawlResult> = {};
	for (const task of tasks) {
		const taskStartTime = Date.now();
		const taskStartAnnotation = {
			toolCallId,
			id: nanoid(),
			type: "crawl",
			message: `Starting crawl task ${task.taskId} for ${task.startUrl} with depth ${task.parameters.depth}`,
			status: "processing",
			timestamp: taskStartTime,
		} satisfies AgentToolAnnotation;
		dataStream.write({
			type: "data-message-annotation",
			data: taskStartAnnotation,
		});

		try {
			const crawlResponse = await app.crawlUrl(task.startUrl, {
				maxDepth: task.parameters.depth,
				limit: task.parameters.maxPages,
				scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
			});

			if (crawlResponse.success && crawlResponse.data) {
				const filteredPages = crawlResponse.data
					.map((d) => ({ markdown: d.markdown, metadata: d.metadata }))
					.filter(
						(d): d is PageData =>
							!!d.metadata?.sourceURL &&
							d.markdown !== undefined &&
							d.markdown !== null,
					);
				results[task.taskId] = {
					type: "crawl",
					taskId: task.taskId,
					startUrl: task.startUrl,
					status: "completed",
					data: filteredPages,
				};
			} else {
				throw new Error(
					"error" in crawlResponse ? crawlResponse.error : "Crawl failed",
				);
			}

			const taskCompleteAnnotation = {
				toolCallId,
				id: nanoid(),
				type: "crawl",
				message: `Completed crawl task ${task.taskId} in ${((Date.now() - taskStartTime) / 1000).toFixed(2)}s`,
				status: "complete",
				data: { taskId: task.taskId, durationMs: Date.now() - taskStartTime },
				timestamp: Date.now(),
			} satisfies AgentToolAnnotation;
			dataStream.write({
				type: "data-message-annotation",
				data: taskCompleteAnnotation,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			results[task.taskId] = {
				type: "crawl",
				taskId: task.taskId,
				startUrl: task.startUrl,
				status: "failed",
				error: message,
			};

			const taskErrorAnnotation = {
				toolCallId,
				id: nanoid(),
				type: "crawl",
				message: `Failed crawl task ${task.taskId}: ${message}`,
				status: "failed",
				timestamp: Date.now(),
			} satisfies AgentToolAnnotation;
			dataStream.write({
				type: "data-message-annotation",
				data: taskErrorAnnotation,
			});
		}
	}
	return results;
}

function filterCompletedResults(results: Record<string, CrawlResult>) {
	return Object.fromEntries(
		Object.entries(results).filter(
			([_, result]) =>
				result.status === "completed" && result.data && result.data.length > 0,
		),
	);
}

function cleanCrawlResults(results: Record<string, CrawlResult>) {
	const cleanMetadata = (metadata: FirecrawlDocumentMetadata) => {
		if (!metadata) {
			throw new Error("No metadata found for page");
		}
		return {
			url: metadata.sourceURL,
			ogUrl: metadata.ogURL,
			title: metadata.title || metadata.ogTitle || metadata.sourceURL,
			description: metadata.description || metadata.ogDescription || "",
			image: metadata.ogImage,
			keywords: metadata.keywords,
			author: metadata.author,
			publishedDate: metadata.publishedDate,
			modifiedDate: metadata.modifiedDate,
			section: metadata.section,
			tag: metadata.tag,
		};
	};

	const cleanPageData = (data: PageData[] | undefined) => {
		if (!data) {
			return [];
		}
		return data
			.filter((d) => !!d.metadata && !!d.markdown)
			.map((d) => ({
				markdown: d.markdown,
				metadata: cleanMetadata(d.metadata),
			}));
	};

	const cleanedResults = Object.values(results).map((result) => ({
		...result,
		data: cleanPageData(result.data),
	}));
	return cleanedResults;
}

/** Synthesizes results into a structured answer */
async function synthesizeResults(
	query: string,
	results: CrawlResult[],
	dataStream: UIMessageStreamWriter,
	toolCallId: string,
): Promise<{ answer?: SynthesizedResult; error?: string }> {
	const synthesisStartTime = Date.now();
	const synthesisStartAnnotation = {
		toolCallId,
		id: nanoid(),
		type: "synthesis",
		message: "Synthesizing content from crawl results...",
		status: "processing",
		timestamp: synthesisStartTime,
	} satisfies AgentToolAnnotation;
	dataStream.write({
		type: "data-message-annotation",
		data: synthesisStartAnnotation,
	});

	try {
		const geminiClient = createGoogleGenerativeAI({
			apiKey: env.GEMINI_API_KEY,
		});
		const resultsJsonString = JSON.stringify(results, null, 2);
		const synthesisSystemPrompt = `You are an AI assistant specialized in synthesizing information from web crawl results. Answer the query "${query}" using *only* the markdown content from the provided JSON object, which contains crawl results. Each 'completed' task has a 'data' field with an array of pages, each containing 'markdown' and 'metadata'. Structure your response with a title, explanation, keyFindings, optional interestingPoints, and limitations.`;
		const synthesisPrompt = `Synthesize the information for the query "${query}" from this JSON:\n\`\`\`json\n${resultsJsonString}\n\`\`\``;

		const { object: synthesisObject, finishReason } = await generateObject({
			model: geminiClient("gemini-2.0-flash-001"),
			schema: synthesizedResultSchema,
			prompt: synthesisPrompt,
			system: synthesisSystemPrompt,
		});

		if (finishReason !== "stop" || !synthesisObject) {
			throw new Error(`Synthesis failed. Finish reason: ${finishReason}`);
		}

		const synthesisCompleteAnnotation = {
			toolCallId,
			id: nanoid(),
			type: "synthesis",
			message: `Synthesis completed in ${((Date.now() - synthesisStartTime) / 1000).toFixed(2)}s`,
			status: "complete",
			data: { durationMs: Date.now() - synthesisStartTime },
			timestamp: Date.now(),
		} satisfies AgentToolAnnotation;
		dataStream.write({
			type: "data-message-annotation",
			data: synthesisCompleteAnnotation,
		});

		return { answer: synthesisObject };
	} catch (error) {
		const errMsg = `Synthesis failed: ${error instanceof Error ? error.message : "Unknown error"}`;
		const synthesisErrorAnnotation = {
			toolCallId,
			id: nanoid(),
			type: "synthesis",
			message: errMsg,
			status: "failed",
			timestamp: Date.now(),
		} satisfies AgentToolAnnotation;
		dataStream.write({
			type: "data-message-annotation",
			data: synthesisErrorAnnotation,
		});
		return { error: errMsg };
	}
}

/** Constructs final sources for citation */
function constructFinalSources(
	results: Record<string, CrawlResult>,
): ToolSource[] {
	const finalSources: ToolSource[] = [];
	const processedUrls = new Set<string>();

	for (const result of Object.values(results)) {
		if (result.status !== "completed" || !result.data) {
			continue;
		}
		for (const pageData of result.data) {
			const url = pageData.metadata?.sourceURL;
			if (url && !processedUrls.has(url)) {
				const metadata = pageData.metadata;
				const title = metadata?.ogTitle || metadata?.title || url;
				const description =
					metadata?.ogDescription || metadata?.description || "";
				const previewContent =
					description || trimMarkdown(pageData.markdown, 250);

				finalSources.push({
					type: "url",
					url,
					title,
					icon: metadata?.ogImage,
					content: previewContent,
				});
				processedUrls.add(url);
			}
		}
	}
	return finalSources;
}
