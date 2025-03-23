/// <reference types="../../../worker-configuration.d.ts" />

import { DurableObject } from "cloudflare:workers";
import type { ChatRoomMessage, ChatRoomMessagePartial } from "@/cs-shared";
//import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import {
	createDataStreamResponse,
	generateObject,
	smoothStream,
	streamText,
} from "ai";
import {
	type DrizzleSqliteDODatabase,
	drizzle,
} from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import {
	agentMessagesToContextCoreMessages,
	chatRoomMessagesToAgentMessages,
	processDataStream,
} from "../../lib/ai/ai-utils";
import {
	agentSystemPrompt,
	checkIfMessagesAreRelevantSystemPrompt,
} from "../../lib/ai/prompts/agent-prompt";
import {
	createMessageThreadTool,
	deepResearchTool,
	searchInformationTool,
} from "../../lib/ai/tools";
import migrations from "./db/migrations/migrations";
import { createAgentDbServices } from "./db/services";
import type { AgentChatRoomQueueItem, AgentMessage } from "./types";

const ALARM_TIME_IN_MS = 3 * 1000; // Standard wait time for batching messages

export class AgentDurableObject extends DurableObject<Env> {
	storage: DurableObjectStorage;
	db: DrizzleSqliteDODatabase;
	dbServices: ReturnType<typeof createAgentDbServices>;
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.storage = ctx.storage;
		this.db = drizzle(this.storage, { logger: false });
		this.ctx.blockConcurrencyWhile(async () => {
			await this.migrate();
		});
		this.dbServices = createAgentDbServices(this.db, this.ctx.id.toString());
	}

	async migrate() {
		migrate(this.db, migrations);
	}

	async receiveMessage({
		chatRoomId,
		message,
	}: {
		chatRoomId: string;
		message: ChatRoomMessage;
	}) {
		await this.ensureChatRoomExists(chatRoomId);

		console.log("[receiveMessage] message", message);

		const queueItem = await this.dbServices.getChatRoomQueueItem(
			chatRoomId,
			message.threadId,
		);

		const now = Date.now();
		const pastProcessAt = queueItem?.processAt;

		console.log(
			"[receiveMessage] queueItem",
			JSON.parse(JSON.stringify(queueItem ?? "null")),
		);

		if (!queueItem || !pastProcessAt || pastProcessAt < now) {
			const processAt = now + ALARM_TIME_IN_MS;

			await this.dbServices.createOrUpdateChatRoomQueueItem({
				chatRoomId,
				threadId: message.threadId,
				processAt,
			});

			console.log("[receiveMessage] setChatRoomCheckAlarm");

			await this.setChatRoomCheckAlarm();
		}
	}

	private async setChatRoomCheckAlarm() {
		const currentAlarm = await this.storage.getAlarm();

		console.log("[setChatRoomCheckAlarm] currentAlarm", {
			biggerThanCurrentTime: currentAlarm && currentAlarm < Date.now(),
			currentAlarm: currentAlarm
				? new Date(currentAlarm).toISOString()
				: "null",
		});

		if (!currentAlarm || currentAlarm < Date.now()) {
			await this.storage.deleteAlarm();
			console.log("[setChatRoomCheckAlarm] currentAlarm is null");

			const nextProcessingResult =
				await this.dbServices.getChatRoomQueueMinProcessAt();

			const earliestProcessAt = nextProcessingResult?.minProcessAt;

			if (earliestProcessAt) {
				console.log(
					"[setChatRoomCheckAlarm] earliestProcessAt",
					earliestProcessAt,
				);
				await this.storage.setAlarm(earliestProcessAt);
			}
		}
	}

	async alarm() {
		const currentTime = Date.now();

		console.log("[alarm] currentTime", currentTime);

		const queueItemsToProcess =
			await this.dbServices.getChatRoomQueueItemsToProcess(currentTime);

		const processingPromises = queueItemsToProcess.map(async (queueItem) => {
			console.log(
				"[alarm] processing queueItem",
				JSON.parse(JSON.stringify(queueItem)),
			);

			try {
				await this.processNewMessages(queueItem);
			} catch (error) {
				console.error(`Error processing queue item ${queueItem.id}:`, error);
			}
		});

		console.log("[alarm] processingPromises", processingPromises);

		await Promise.all(processingPromises);
		await this.setChatRoomCheckAlarm();
	}

	private async processNewMessages(chatRoomQueueItem: AgentChatRoomQueueItem) {
		const messageResult = await this.ctx.blockConcurrencyWhile(async () => {
			const messageWithContext = await this.gatherMessagesWithContext(
				chatRoomQueueItem.roomId,
				{
					threadId: chatRoomQueueItem.threadId,
					lastProcessedId: chatRoomQueueItem.lastProcessedId,
				},
			);
			await this.dbServices.clearChatRoomQueueProcessAt(chatRoomQueueItem.id);

			return messageWithContext;
		});

		console.log(
			"[processNewMessages] newMessages",
			JSON.parse(
				JSON.stringify({
					contextMessages: messageResult.contextMessages,
					newMessages: messageResult.newMessages,
				}),
			),
		);

		if (messageResult.newMessages.length === 0) {
			return;
		}

		const needsResponse = await this.evaluateNeedForResponse(
			chatRoomQueueItem.roomId,
			messageResult.newMessages,
		);

		console.log("[processNewMessages] needsResponse", needsResponse);

		const newAgentMessages: ChatRoomMessage[] = [];

		if (needsResponse) {
			// @ts-ignore Type error: Type instantiation is excessively deep and possibly infinite.
			await this.formulateResponse({
				chatRoomId: chatRoomQueueItem.roomId,
				threadId: chatRoomQueueItem.threadId,
				newMessages: messageResult.newMessages,
				contextMessages: messageResult.contextMessages,
				onMessage: async ({ newMessagePartial, existingMessageId }) => {
					const newMessage = await this.sendResponse({
						chatRoomId: chatRoomQueueItem.roomId,
						message: newMessagePartial,
						existingMessageId: existingMessageId ?? null,
					});

					newAgentMessages.push(newMessage);

					return newMessage;
				},
			});
		}

		const newAgentMessagesDeduplicated = newAgentMessages.filter(
			(message, index, self) =>
				index === self.findIndex((t) => t.id === message.id),
		);

		const highestMessageId = Math.max(
			...messageResult.newMessages.map((msg) => msg.id),
			...newAgentMessagesDeduplicated.map((msg) => msg.id),
		);

		if (highestMessageId > 0) {
			console.log(
				"[processNewMessages] updating chatRoomQueueLastProcessedId",
				highestMessageId,
			);

			await this.dbServices.updateChatRoomQueueLastProcessedId(
				chatRoomQueueItem.id,
				highestMessageId,
			);
		}
	}

	// Step 1: Gather messages and context
	private async gatherMessagesWithContext(
		chatRoomId: string,
		{
			threadId,
			lastProcessedId,
			contextSize = 10,
		}: {
			threadId: number | null;
			lastProcessedId: number | null;
			contextSize?: number;
		},
	) {
		const chatRoomDoId = this.env.CHAT_DURABLE_OBJECT.idFromString(chatRoomId);
		const chatRoomDO = this.env.CHAT_DURABLE_OBJECT.get(chatRoomDoId);

		const newMessages: ChatRoomMessage[] = lastProcessedId
			? await chatRoomDO.getMessages({
					threadId,
					afterId: lastProcessedId,
				})
			: await chatRoomDO.getMessages({
					threadId,
				});

		let contextMessages: ChatRoomMessage[] = [];
		if (lastProcessedId && contextSize > 0) {
			contextMessages = await chatRoomDO.getMessages({
				threadId,
				beforeId: lastProcessedId,
				limit: contextSize,
			});
		}

		if (threadId) {
			const threadMessage = await chatRoomDO.getMessageById(threadId);
			if (threadMessage) {
				contextMessages = [threadMessage, ...contextMessages];
			}
		}

		return {
			newMessages,
			contextMessages,
			allMessages: [...contextMessages, ...newMessages],
		};
	}

	private async evaluateNeedForResponse(
		roomId: string,
		messages: ChatRoomMessage[],
	): Promise<boolean> {
		const hasMentionsOfAgent = await this.checkIfImMentioned(messages);

		if (hasMentionsOfAgent) {
			return true;
		}

		const aiMessages = chatRoomMessagesToAgentMessages(messages);
		const isRelevant = await this.checkIfMessagesAreRelevant(
			roomId,
			aiMessages,
		);
		return isRelevant;
	}

	private async checkIfImMentioned(messages: ChatRoomMessage[]) {
		const agentConfig = await this.dbServices.getAgentConfig();
		return messages.some((message) =>
			message.mentions.some((mention) => mention.id === agentConfig.id),
		);
	}

	private async checkIfMessagesAreRelevant(
		roomId: string,
		messages: AgentMessage[],
	) {
		const agentConfig = await this.dbServices.getAgentConfig();
		const chatRoom = await this.dbServices.getChatRoom(roomId);

		const groqClient = createGroq({
			baseURL: this.env.AI_GATEWAY_GROQ_URL,
			apiKey: this.env.GROQ_API_KEY,
		});

		const { object: shouldRespond } = await generateObject({
			model: groqClient("llama-3.1-8b-instant"),
			system: checkIfMessagesAreRelevantSystemPrompt({
				agentConfig,
				chatRoom: {
					name: chatRoom.name,
				},
			}),
			output: "enum",
			enum: ["relevant", "irrelevant"],
			mode: "tool",
			prompt: `
			<messages_to_evaluate>
			${JSON.stringify(messages)}
			</messages_to_evaluate>
			`,
		});

		return shouldRespond === "relevant";
	}

	private async formulateResponse({
		chatRoomId,
		threadId: originalThreadId,
		newMessages,
		contextMessages,
		onMessage,
	}: {
		chatRoomId: string;
		threadId: number | null;
		newMessages: ChatRoomMessage[];
		contextMessages: ChatRoomMessage[];
		onMessage: ({
			newMessagePartial,
			existingMessageId,
		}: {
			newMessagePartial: ChatRoomMessagePartial;
			existingMessageId?: number | null;
		}) => Promise<ChatRoomMessage>;
	}) {
		console.log("[formulateResponse] chatRoomId", chatRoomId);
		const agentConfig = await this.dbServices.getAgentConfig();
		const chatRoom = await this.dbServices.getChatRoom(chatRoomId);

		const openAIClient = createOpenAI({
			baseURL: this.env.AI_GATEWAY_OPENAI_URL,
			apiKey: this.env.OPENAI_API_KEY,
		});

		let sendMessageThreadId: number | null = originalThreadId;
		console.log("[formulateResponse] sendMessageThreadId", sendMessageThreadId);

		const agentToolSet = {
			searchInformation: searchInformationTool({
				braveApiKey: this.env.BRAVE_API_KEY,
			}),
			deepResearch: deepResearchTool(),
			createMessageThread: createMessageThreadTool({
				onMessage,
				onNewThread: (newThreadId) => {
					console.log("[formulateResponse] onNewThread", newThreadId);
					sendMessageThreadId = newThreadId;
					// TODO: We also need to create a queue item for the new thread
					/* this.dbServices.createOrUpdateChatRoomQueueItem({
						chatRoomId,
						threadId: newThreadId,
						processAt: Date.now() + ALARM_TIME_IN_MS,
					}); */
				},
			}),
		};

		const systemPrompt = agentSystemPrompt({
			agentConfig,
			chatRoom: {
				id: chatRoom.id,
				name: chatRoom.name,
				threadId: sendMessageThreadId,
			},
		});

		const messages = agentMessagesToContextCoreMessages(
			contextMessages,
			newMessages,
		);

		const dataStreamResponse = createDataStreamResponse({
			execute: async (dataStream) => {
				streamText({
					model: openAIClient("gpt-4o"),
					system: systemPrompt,
					tools: agentToolSet,
					messages,
					maxSteps: 10,
					experimental_transform: smoothStream({
						chunking: "line",
					}),
				}).mergeIntoDataStream(dataStream);
			},
		});

		await processDataStream({
			response: dataStreamResponse,
			getThreadId: () => sendMessageThreadId,
			omitSendingTool: ["createMessageThread"],
			onMessageSend: onMessage,
		});
	}

	private async sendResponse({
		chatRoomId,
		message,
		existingMessageId,
	}: {
		chatRoomId: string;
		message: ChatRoomMessagePartial;
		existingMessageId: number | null;
	}) {
		const chatRoomDoId = this.env.CHAT_DURABLE_OBJECT.idFromString(chatRoomId);
		const chatRoomDO = this.env.CHAT_DURABLE_OBJECT.get(chatRoomDoId);

		const chatRoomMessage = await chatRoomDO.receiveChatRoomMessage({
			memberId: this.ctx.id.toString(),
			message,
			existingMessageId,
			notifyAgents: false,
		});

		return chatRoomMessage;
	}

	async insertAgentConfig(
		agentConfigData: Parameters<typeof this.dbServices.insertAgentConfig>[0],
	) {
		await this.dbServices.insertAgentConfig(agentConfigData);
	}

	async updateAgentConfig(
		agentConfigData: Parameters<typeof this.dbServices.updateAgentConfig>[0],
	) {
		await this.dbServices.updateAgentConfig(agentConfigData);
	}

	async addChatRoom(
		chatRoom: Parameters<typeof this.dbServices.addChatRoom>[0],
	) {
		await this.dbServices.addChatRoom(chatRoom);
	}

	async deleteChatRoom(chatRoomId: string) {
		await this.dbServices.deleteChatRoom(chatRoomId);
	}

	private async ensureChatRoomExists(chatRoomId: string) {
		try {
			await this.dbServices.getChatRoom(chatRoomId);
		} catch (error) {
			console.log(
				`Chat room ${chatRoomId} not found, creating it: ${error instanceof Error ? error.message : String(error)}`,
			);

			const chatRoomDO = this.env.CHAT_DURABLE_OBJECT.get(
				this.env.CHAT_DURABLE_OBJECT.idFromString(chatRoomId),
			);

			const config = await chatRoomDO.getConfig();

			await this.dbServices.addChatRoom({
				id: chatRoomId,
				name: config.name,
				organizationId: config.organizationId,
			});
		}
	}
}
