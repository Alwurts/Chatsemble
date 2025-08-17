import { createOpenAI } from "@ai-sdk/openai";
import { getDefaultAgentSystemPrompt } from "@server/ai/prompts/agent/default-prompt";
import {
	getWorkflowAgentSystemPrompt,
	getWorkflowAgentUserPrompt,
} from "@server/ai/prompts/agent/workflow-prompt";
import { routeMessageToAgentSystemPrompt } from "@server/ai/prompts/router-prompt";
import { getAgentTools } from "@server/ai/tools";
import { contextAndNewchatRoomMessagesToModelMessages } from "@server/ai/utils/message";
import { createChatRoomMessagePartial } from "@shared/lib/chat";
import type {
	ChatRoom,
	ChatRoomMember,
	ChatRoomMessage,
	Document,
	WorkflowPartial,
} from "@shared/types";
import type { AIUIMessage } from "@shared/types/ai";
import type { ModelMessage } from "ai";
import {
	createUIMessageStream,
	generateObject,
	readUIMessageStream,
	smoothStream,
	stepCountIs,
	streamText,
} from "ai";
import { z } from "zod";
import type { ChatRooms } from "./chat-room";
import type { ChatRoomDbServices } from "./db/services";

interface AgentsDependencies {
	dbServices: ChatRoomDbServices;
	processIncomingChatMessage: (
		params: Parameters<ChatRooms["processIncomingChatMessage"]>[0],
	) => Promise<ChatRoomMessage>;
	createWorkflow: (
		params: Parameters<ChatRoomDbServices["createAgentWorkflow"]>[0],
	) => Promise<WorkflowPartial>;
	createDocument: (
		params: Parameters<ChatRoomDbServices["createDocument"]>[0],
	) => Promise<Document>;
}

export class Agents {
	private env: Env;
	private deps: AgentsDependencies;

	constructor(env: Env, deps: AgentsDependencies) {
		this.env = env;
		this.deps = deps;
	}

	routeWorkflowToRelevantAgent = async ({
		workflow,
	}: {
		workflow: WorkflowPartial;
	}) => {
		console.log("Processing workflow :", workflow);

		const agentId = workflow.agentId;

		const agentConfig = await this.deps.dbServices.getAgentById(agentId);

		if (!agentConfig) {
			console.error(`Agent config not found for agent ${agentId}`);
			throw new Error(`Agent config not found for agent ${agentId}`);
		}

		const workflowPrompt = getWorkflowAgentUserPrompt({ workflow });

		console.log(`Workflow prompt: ${workflowPrompt}`);

		const systemPrompt = getWorkflowAgentSystemPrompt({
			agentConfig,
			chatRoomId: workflow.chatRoomId,
		});

		await this.generateAndStreamAgentResponse({
			agentId,
			chatRoomId: workflow.chatRoomId,
			threadId: null,
			messages: [
				{
					content: [{ type: "text", text: workflowPrompt }],
					role: "user",
				},
			],
			systemPrompt,
			removeTools: ["scheduleWorkflow"],
		});
	};

	routeMessageToRelevantAgents = async (
		newMessage: ChatRoomMessage,
	): Promise<void> => {
		try {
			console.log(
				`[routeMessageAndNotifyAgents] Routing message ${newMessage.id}`,
			);
			const roomId = newMessage.roomId;
			const threadId = newMessage.threadId;
			const contextSize = 10;

			let contextMessages: ChatRoomMessage[] = [];

			contextMessages = await this.deps.dbServices.getChatRoomMessages({
				threadId,
				roomId,
				beforeId: newMessage.id,
				limit: contextSize,
			});

			if (threadId) {
				// We put the thread parent message at the beginning of the context messages
				const threadParentMessage =
					await this.deps.dbServices.getChatRoomMessageById(threadId);
				if (threadParentMessage) {
					contextMessages = [threadParentMessage, ...contextMessages];
				}
			}

			const agentMembers = await this.deps.dbServices.getChatRoomMembers({
				roomId,
				type: "agent",
			});

			if (agentMembers.length === 0) {
				console.log("[routeMessageAndNotifyAgents] No agents in the room.");
				return;
			}

			const roomConfig = await this.deps.dbServices.getChatRoomById(roomId);

			if (!roomConfig) {
				console.error("Room config not found");
				throw new Error("Room config not found");
			}

			const targetAgentId = await this.determineRelevantAgentForMessage({
				contextMessages,
				newMessage,
				agents: agentMembers,
				room: roomConfig,
			});

			if (!targetAgentId) {
				console.log(
					"[routeMessageAndNotifyAgents] Router decided no agent should respond.",
				);
				return;
			}

			await this.initiateAgentResponseToMessages({
				agentId: targetAgentId,
				chatRoomId: roomId,
				threadId,
				newMessage,
				contextMessages,
			});
		} catch (error) {
			console.error("Error routing message to agents:", error);
		}
	};

	private determineRelevantAgentForMessage = async ({
		contextMessages,
		newMessage,
		agents,
		room,
	}: {
		contextMessages: ChatRoomMessage[];
		newMessage: ChatRoomMessage;
		agents: ChatRoomMember[];
		room: ChatRoom;
	}): Promise<string | null> => {
		console.log(
			"[routeMessageToAgents] Deciding which agent(s) should respond.",
		);
		if (agents.length === 0) {
			return null;
		}

		const threadId = newMessage.threadId;

		const mentionedAgentIds = new Set<string>();
		for (const mention of newMessage.mentions) {
			if (agents.some((agent) => agent.id === mention.id)) {
				mentionedAgentIds.add(mention.id);
			}
		}

		if (mentionedAgentIds.size > 0) {
			const mentionedIdsArray = Array.from(mentionedAgentIds);
			console.log(
				"[routeMessageToAgents] Routing based on mentions:",
				mentionedIdsArray,
			);
			return mentionedIdsArray[0];
		}

		// Check if there's already an AI agent in the conversation history
		// and no explicit mentions - default to that agent
		if (contextMessages.length > 0 && threadId) {
			// Find the most recent assistant message to get the agent that was responding
			const lastAssistantMessage = contextMessages
				.slice()
				.reverse()
				.find((msg) => msg.member.type === "agent");

			if (lastAssistantMessage?.member.id) {
				return lastAssistantMessage.member.id;
			}
		}

		const openAIClient = createOpenAI({
			baseURL: this.env.AI_GATEWAY_OPENAI_URL,
			apiKey: this.env.OPENAI_API_KEY,
		});

		try {
			const agentIds = agents.map((a) => a.id);

			const agentList = await this.deps.dbServices.getAgentsByIds(agentIds);

			const aiMessages = contextAndNewchatRoomMessagesToModelMessages({
				contextMessages,
				newMessage,
			});

			const { object: targetAgents } = await generateObject({
				system: routeMessageToAgentSystemPrompt({ agents: agentList, room }),
				schema: z.object({
					agentId: z
						.string()
						.describe(
							`Agent IDs that should respond to the message. Possible IDs: ${agents.map((a) => a.id).join(", ")}.`,
						),
				}),
				messages: aiMessages,
				model: openAIClient("gpt-4.1-mini"),
			});

			console.log("[routeMessageToAgents] AI decided:", targetAgents.agentId);
			return targetAgents.agentId;
		} catch (error) {
			console.error("Error in AI routing:", error);
			return null;
		}
	};

	private initiateAgentResponseToMessages = async ({
		agentId,
		chatRoomId,
		threadId,
		newMessage,
		contextMessages,
	}: {
		agentId: string;
		chatRoomId: string;
		threadId: number | null;
		newMessage: ChatRoomMessage;
		contextMessages: ChatRoomMessage[];
	}) => {
		if (!newMessage) {
			return;
		}

		const agentConfig = await this.deps.dbServices.getAgentById(agentId);

		if (!agentConfig) {
			console.error("Agent config not found");
			throw new Error("Agent config not found");
		}

		const messages = contextAndNewchatRoomMessagesToModelMessages({
			contextMessages,
			newMessage,
			agentIdForAssistant: agentId,
		});

		console.log("[processAndRespondIncomingMessages] messages", messages);

		const systemPrompt = getDefaultAgentSystemPrompt({
			agentConfig,
			chatRoomId: chatRoomId,
			threadId: threadId, // Pass the current threadId
		});

		await this.generateAndStreamAgentResponse({
			agentId,
			chatRoomId,
			threadId,
			messages,
			systemPrompt,
		});
	};

	private generateAndStreamAgentResponse = async ({
		agentId,
		chatRoomId,
		threadId: originalThreadId,
		messages,
		systemPrompt,
		// TODO: removeTools,
	}: {
		agentId: string;
		chatRoomId: string;
		threadId: number | null;
		messages: ModelMessage[];
		systemPrompt: string;
		removeTools?: string[];
	}) => {
		let currentMessage: ChatRoomMessage | null = null;
		let currentThreadId: number | null = originalThreadId;

		const openAIClient = createOpenAI({
			baseURL: this.env.AI_GATEWAY_OPENAI_URL,
			apiKey: this.env.OPENAI_API_KEY,
		});

		try {
			const stream = createUIMessageStream({
				execute: ({ writer }) => {
					const result = streamText({
						model: openAIClient("gpt-4.1-mini"),
						system: systemPrompt,
						messages,
						tools: getAgentTools(writer),
						stopWhen: stepCountIs(10),
						experimental_transform: smoothStream({
							chunking: "word",
							delayInMs: 40,
						}),
					});

					writer.merge(result.toUIMessageStream());
				},
			});

			for await (const uiMessage of readUIMessageStream<AIUIMessage>({
				stream,
			})) {
				if (!currentMessage) {
					const newMessagePartial = createChatRoomMessagePartial({
						parts: [],
						mentions: [],
						threadId: currentThreadId,
						roomId: chatRoomId,
						status: "pending",
					});

					currentMessage = await this.deps.processIncomingChatMessage({
						roomId: chatRoomId,
						memberId: agentId,
						message: newMessagePartial,
						existingMessageId: null,
						notifyAgents: false,
					});
				}

				const partsHaveCreateThreadToolOutputAvailable = uiMessage.parts.some(
					(part) =>
						part.type === "tool-create-message-thread" &&
						part.state === "output-available",
				);

				if (partsHaveCreateThreadToolOutputAvailable) {
					const indexOfCreateThreadTool = uiMessage.parts.findIndex(
						(part) => part.type === "tool-create-message-thread",
					);

					const isCreateThreadToolInLastPart =
						indexOfCreateThreadTool === uiMessage.parts.length - 1;

					if (isCreateThreadToolInLastPart) {
						const newThreadId = currentMessage.id;

						currentMessage.parts = uiMessage.parts;
						currentMessage.status = "completed";
						await this.deps.processIncomingChatMessage({
							roomId: chatRoomId,
							memberId: agentId,
							message: currentMessage,
							existingMessageId: currentMessage.id,
							notifyAgents: false,
						});

						console.log("New message parent thread", currentMessage);

						currentMessage = null;
						currentThreadId = newThreadId;
					} else {
						const slicedParts = uiMessage.parts.slice(
							indexOfCreateThreadTool + 1,
						);

						currentMessage.parts = slicedParts;

						await this.deps.processIncomingChatMessage({
							roomId: chatRoomId,
							memberId: agentId,
							message: currentMessage,
							existingMessageId: currentMessage.id,
							notifyAgents: false,
						});
					}
				} else {
					currentMessage.parts = uiMessage.parts;

					await this.deps.processIncomingChatMessage({
						roomId: chatRoomId,
						memberId: agentId,
						message: currentMessage,
						existingMessageId: currentMessage.id,
						notifyAgents: false, // AI response shouldn't re-notify agents
					});
				}
			}

			if (currentMessage) {
				currentMessage.status = "completed";
				await this.deps.processIncomingChatMessage({
					roomId: chatRoomId,
					memberId: agentId,
					message: currentMessage,
					existingMessageId: currentMessage.id,
					notifyAgents: false, // AI response shouldn't re-notify agents
				});
			}
		} catch (error) {
			console.error("[formulateResponse] error", error);
		}
	};
}
