import { tool } from "ai";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import type {
	ChatRoomMessage,
	ChatRoomMessagePartial,
} from "../../../../../cs-shared/src/types/chat";
import FirecrawlApp, {} from "firecrawl";
import { env } from "cloudflare:workers";

export const searchInformationTool = ({
	braveApiKey,
}: { braveApiKey: string }) =>
	tool({
		description:
			"Use this tool when the user asks you to search for any kind of information or requires more information about a topic",
		parameters: z.object({
			query: z.string().describe("The search query"),
		}),
		execute: async ({ query }) => {
			const searchParams = new URLSearchParams({ q: query });
			const response = await fetch(
				`https://api.search.brave.com/res/v1/web/search?${searchParams}`,
				{
					headers: {
						Accept: "application/json",
						"Accept-Encoding": "gzip",
						"X-Subscription-Token": braveApiKey,
					},
				},
			);

			if (!response.ok) {
				throw new Error(`Brave API error: ${response.statusText}`);
			}

			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const data = (await response.json()) as any;
			return {
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				result: data.web?.results?.slice(0, 5).map((r: any) => ({
					title: r.title,
					url: r.url,
					description: r.description,
					language: r.language,
					age: r.age,
					extraSnippets: r.extra_snippets,
				})),
			};
		},
	});

export const deepResearchTool = () =>
	tool({
		description:
			"Use this tool when the user asks you to deeply research a topic",
		parameters: z.object({
			query: z.string().describe("The research query"),
		}),
		execute: async ({ query }) => {
			const firecrawl = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

			// Define research parameters
			const params = {
				maxDepth: 3, // Number of research iterations
				timeLimit: 60, // Time limit in seconds
				maxUrls: 10, // Maximum URLs to analyze
			};

			// Run deep research
			const results = await firecrawl.deepResearch(
				query,
				params,
				(activity) => {
					console.log(`[${activity.type}] ${activity.message}`);
				},
			);
			return results;
		},
	});

export const createMessageThreadTool = ({
	onMessage,
	onNewThread,
}: {
	onMessage: ({
		newMessagePartial,
	}: {
		newMessagePartial: ChatRoomMessagePartial;
	}) => Promise<ChatRoomMessage>;
	onNewThread: (newThreadId: number) => void;
}) =>
	tool({
		description:
			"Use this tool to create a new message thread if we are not already responding in a thread (threadId is null)",
		parameters: z.object({
			message: z.string().describe("The message to include in the thread"),
		}),
		execute: async ({ message }) => {
			const { id: newThreadId } = await onMessage({
				newMessagePartial: {
					id: Number(customAlphabet("0123456789", 20)()),
					content: message,
					mentions: [],
					toolUses: [],
					createdAt: Date.now(),
					threadId: null,
				},
			});
			onNewThread(newThreadId);
			return {
				success: true,
				newThreadId,
			};
		},
	});
