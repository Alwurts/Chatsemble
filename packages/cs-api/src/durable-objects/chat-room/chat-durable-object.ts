/// <reference types="../../../worker-configuration.d.ts" />

import { DurableObject } from "cloudflare:workers";
import type {
	ChatRoom,
	ChatRoomMember,
	ChatRoomMessage,
	ChatRoomMessagePartial,
	WsChatIncomingMessage,
	WsChatOutgoingMessage,
} from "@/cs-shared";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";

import { drizzle } from "drizzle-orm/durable-sqlite";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import {
	routeMessageToAgentSystemPrompt,
	routeMessageToAgentUserPrompt,
} from "../../lib/ai/prompts/router-prompt";
import type { Session } from "../../types/session";
import migrations from "./db/migrations/migrations";
import { createChatRoomDbServices } from "./db/services";
import { z } from "zod";

export class ChatDurableObject extends DurableObject<Env> {
	storage: DurableObjectStorage;
	db: DrizzleSqliteDODatabase;
	sessions: Map<WebSocket, Session>;
	dbServices: ReturnType<typeof createChatRoomDbServices>;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.storage = ctx.storage;
		this.db = drizzle(this.storage, { logger: false });
		this.sessions = new Map();

		this.ctx.blockConcurrencyWhile(async () => {
			await this.migrate();
		});

		this.dbServices = createChatRoomDbServices(this.db, this.ctx.id.toString());

		// Restore any existing WebSocket sessions
		for (const webSocket of ctx.getWebSockets()) {
			const meta = webSocket.deserializeAttachment() || {};
			this.sessions.set(webSocket, meta);
		}
	}

	async migrate() {
		migrate(this.db, migrations);
	}

	async delete() {
		this.storage.deleteAll();
	}

	async fetch(request: Request) {
		const url = new URL(request.url);
		const userId = url.searchParams.get("userId");

		if (!userId) {
			return new Response("Missing user ID", { status: 400 });
		}

		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		this.ctx.acceptWebSocket(server);

		const session: Session = {
			userId,
		};
		server.serializeAttachment(session);
		this.sessions.set(server, session);

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(webSocket: WebSocket, message: string) {
		const session = this.sessions.get(webSocket);
		if (!session) {
			return;
		}

		try {
			const parsedMsg: WsChatIncomingMessage = JSON.parse(message);
			switch (parsedMsg.type) {
				case "message-send": {
					await this.receiveChatRoomMessage({
						memberId: session.userId,
						message: parsedMsg.message,
						existingMessageId: null,
						notifyAgents: true,
					});
					break;
				}
				case "chat-init-request": {
					this.sendWebSocketMessageToUser(
						{
							type: "chat-init-response",
							messages: await this.getMessages({
								threadId: null,
							}),
							members: await this.getMembers(),
							room: await this.getConfig(),
						},
						session.userId,
					);
					break;
				}
				case "thread-init-request": {
					const threadMessage = await this.getMessageById(parsedMsg.threadId);
					if (!threadMessage) {
						throw new Error("Thread message not found");
					}

					const threadMessages = await this.getMessages({
						threadId: parsedMsg.threadId,
					});

					this.sendWebSocketMessageToUser(
						{
							type: "thread-init-response",
							threadId: parsedMsg.threadId,
							threadMessage,
							messages: threadMessages,
						},
						session.userId,
					);
					break;
				}
			}
		} catch (err) {
			if (err instanceof Error) {
				webSocket.send(JSON.stringify({ error: err.message }));
			}
		}
	}

	async webSocketClose(webSocket: WebSocket) {
		this.sessions.delete(webSocket);
		webSocket.close();
	}

	async webSocketError(webSocket: WebSocket) {
		this.sessions.delete(webSocket);
		webSocket.close();
	}

	private sendWebSocketMessageToUser(
		message: WsChatOutgoingMessage,
		sentToUserId: string,
	) {
		for (const [ws, session] of this.sessions.entries()) {
			if (session.userId === sentToUserId) {
				ws.send(JSON.stringify(message));
			}
		}
	}

	private broadcastWebSocketMessage(
		message: WsChatOutgoingMessage,
		excludeUserId?: string,
	) {
		for (const [ws, session] of this.sessions.entries()) {
			if (!excludeUserId || session.userId !== excludeUserId) {
				ws.send(JSON.stringify(message));
			}
		}
	}

	async receiveChatRoomMessage({
		memberId,
		message,
		existingMessageId,
		notifyAgents,
	}: {
		memberId: string;
		message: ChatRoomMessagePartial;
		existingMessageId: number | null;
		notifyAgents: boolean;
	}): Promise<ChatRoomMessage> {
		let chatRoomMessage: ChatRoomMessage;

		if (existingMessageId) {
			chatRoomMessage = await this.dbServices.updateMessage(existingMessageId, {
				content: message.content,
				mentions: message.mentions,
				toolUses: message.toolUses,
			});
		} else {
			chatRoomMessage = await this.dbServices.insertMessage({
				memberId,
				content: message.content,
				mentions: message.mentions,
				toolUses: message.toolUses,
				threadId: message.threadId,
				metadata: {
					optimisticData: {
						createdAt: message.createdAt,
						id: message.id,
					},
				},
				threadMetadata: null,
			});

			if (message.threadId) {
				const updatedThreadMessage =
					await this.dbServices.updateMessageThreadMetadata(
						message.threadId,
						chatRoomMessage,
					);

				this.broadcastWebSocketMessage({
					type: "message-broadcast",
					threadId: updatedThreadMessage.threadId,
					message: updatedThreadMessage,
				});
			}
		}

		this.broadcastWebSocketMessage({
			type: "message-broadcast",
			threadId: chatRoomMessage.threadId,
			message: chatRoomMessage,
		});

		if (notifyAgents && !existingMessageId) {
			await this.routeMessageAndNotifyAgents(chatRoomMessage);
		}

		return chatRoomMessage;
	}

	private async routeMessageAndNotifyAgents(newMessage: ChatRoomMessage) {
		try {
			console.log(
				`[routeMessageAndNotifyAgents] Routing message ${newMessage.id}`,
			);
			const threadId = newMessage.threadId;
			const contextSize = 10;

			let contextMessages: ChatRoomMessage[] = [];
			if (newMessage.id) {
				contextMessages = await this.getMessages({
					threadId,
					beforeId: newMessage.id,
					limit: contextSize,
				});
			}
			if (threadId) {
				const threadMessage = await this.getMessageById(threadId);
				if (threadMessage) {
					contextMessages = [threadMessage, ...contextMessages];
				}
			}

			const agentMembers = await this.getMembers({ type: "agent" });
			if (agentMembers.length === 0) {
				console.log("[routeMessageAndNotifyAgents] No agents in the room.");
				return;
			}

			const roomConfig = await this.getConfig();

			const targetAgentIds = await this.routeMessageToAgents({
				contextMessages,
				newMessages: [newMessage],
				agents: agentMembers,
				room: roomConfig,
			});

			if (targetAgentIds.length === 0) {
				console.log(
					"[routeMessageAndNotifyAgents] Router decided no agent should respond.",
				);
				return;
			}

			for (const agentId of targetAgentIds) {
				console.log(`[routeMessageAndNotifyAgents] Notifying agent ${agentId}`);
				const agentDO = this.env.AGENT_DURABLE_OBJECT.get(
					this.env.AGENT_DURABLE_OBJECT.idFromString(agentId),
				);

				await agentDO.processAndRespond({
					chatRoomId: this.ctx.id.toString(),
					threadId: threadId,
					newMessages: [newMessage],
					contextMessages: contextMessages,
				});
			}
		} catch (error) {
			console.error("Error routing message to agents:", error);
		}
	}

	private async routeMessageToAgents({
		contextMessages,
		newMessages,
		agents,
		room,
	}: {
		contextMessages: ChatRoomMessage[];
		newMessages: ChatRoomMessage[];
		agents: ChatRoomMember[];
		room: ChatRoom;
	}): Promise<string[]> {
		console.log(
			"[routeMessageToAgents] Deciding which agent(s) should respond.",
		);
		if (agents.length === 0) {
			return [];
		}

		const mentionedAgentIds = new Set<string>();
		for (const msg of newMessages) {
			for (const mention of msg.mentions) {
				if (agents.some((agent) => agent.id === mention.id)) {
					mentionedAgentIds.add(mention.id);
				}
			}
		}

		if (mentionedAgentIds.size > 0) {
			const mentionedIdsArray = Array.from(mentionedAgentIds);
			console.log(
				"[routeMessageToAgents] Routing based on mentions:",
				mentionedIdsArray,
			);
			return mentionedIdsArray;
		}

		const openAIClient = createOpenAI({
			baseURL: this.env.AI_GATEWAY_OPENAI_URL,
			apiKey: this.env.OPENAI_API_KEY,
		});

		try {
			const agentList = await Promise.all(
				agents.map(async (a) => {
					const agentDO = this.env.AGENT_DURABLE_OBJECT.get(
						this.env.AGENT_DURABLE_OBJECT.idFromString(a.id),
					);
					return await agentDO.getAgentConfig();
				}),
			);

			const { object: targetAgents } = await generateObject({
				model: openAIClient("gpt-4o-mini"),
				system: routeMessageToAgentSystemPrompt({ agents: agentList, room }),
				schema: z.object({
					agentIds: z
						.array(z.string())
						.describe(
							`List of agent IDs that should respond to the messages. Include ID only if agent is relevant. Max ${agents.length} agents. Possible IDs: ${agents.map((a) => a.id).join(", ")}.`,
						),
				}),
				prompt: routeMessageToAgentUserPrompt({
					newMessages,
					contextMessages,
				}),
			});

			const validAgentIds = (targetAgents.agentIds || []).filter((id) =>
				agents.some((a) => a.id === id),
			);
			console.log("[routeMessageToAgents] AI decided:", validAgentIds);
			return validAgentIds;
		} catch (error) {
			console.error("Error in AI routing:", error);
			return [];
		}
	}

	async getMessageById(id: number): Promise<ChatRoomMessage | undefined> {
		return this.dbServices.getMessageById(id);
	}

	async getMessages(
		options: Parameters<typeof this.dbServices.getMessages>[0],
	) {
		return this.dbServices.getMessages(options);
	}

	async addMembers(members: Parameters<typeof this.dbServices.addMembers>[0]) {
		await this.dbServices.addMembers(members);

		this.broadcastWebSocketMessage({
			type: "member-update",
			members: await this.getMembers(),
		});
	}

	async removeMembers(memberIds: string[]) {
		await this.dbServices.removeMembers(memberIds);

		this.broadcastWebSocketMessage({
			type: "member-update",
			members: await this.getMembers(),
		});
	}

	async getMembers(
		filter?: Parameters<typeof this.dbServices.getMembers>[0],
	): Promise<ChatRoomMember[]> {
		return this.dbServices.getMembers(filter);
	}

	async upsertConfig(
		config: Parameters<typeof this.dbServices.upsertConfig>[0],
	) {
		await this.dbServices.upsertConfig(config);
	}

	async getConfig() {
		return this.dbServices.getConfig();
	}
}
