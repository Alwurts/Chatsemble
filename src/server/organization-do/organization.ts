import { DurableObject } from "cloudflare:workers";

import type { Session } from "@server/types/session";
import type {
	ChatRoomMessage,
	WorkflowPartial,
	WsChatIncomingMessage,
	WsChatOutgoingMessage,
} from "@shared/types";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Agents } from "./agent";
import { ChatRooms } from "./chat-room";
import migrations from "./db/migrations/migrations";
import {
	type ChatRoomDbServices,
	createChatRoomDbServices,
} from "./db/services";
import { Documents } from "./document";
import { MCPServers } from "./mcp-server";
import { Workflows } from "./workflow";

export class OrganizationDurableObject extends DurableObject<Env> {
	storage: DurableObjectStorage;
	db: DrizzleSqliteDODatabase;
	sessions: Map<WebSocket, Session>;
	dbServices: ChatRoomDbServices;
	agents: Agents;
	workflows: Workflows;
	chatRooms: ChatRooms;
	documents: Documents;
	mcpServers: MCPServers;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.storage = ctx.storage;
		this.db = drizzle(this.storage, { logger: true });
		this.sessions = new Map();

		this.ctx.blockConcurrencyWhile(async () => {
			console.log("Migrating database");
			await this.migrate();
		});

		this.dbServices = createChatRoomDbServices(this.db);

		// Initialize modules
		this.chatRooms = new ChatRooms({
			dbServices: this.dbServices,
			sessions: this.sessions,
			sendWebSocketMessageToUser: this.sendWebSocketMessageToUser,
			broadcastWebSocketMessageToRoom: this.broadcastWebSocketMessageToRoom,
			routeMessagesToRelevantAgents: this.routeMessagesToRelevantAgents,
		});

		this.agents = new Agents(env, {
			dbServices: this.dbServices,
			processIncomingChatMessage: this.processIncomingChatMessage,
			createWorkflow: this.createWorkflow,
			createDocument: this.createDocument,
		});

		this.workflows = new Workflows({
			dbServices: this.dbServices,
			storage: this.storage,
			broadcastWebSocketMessageToRoom: this.broadcastWebSocketMessageToRoom,
			routeWorkflowToRelevantAgent: this.routeWorkflowToRelevantAgent,
		});

		this.documents = new Documents({
			dbServices: this.dbServices,
			broadcastWebSocketMessageToRoom: this.broadcastWebSocketMessageToRoom,
		});

		this.mcpServers = new MCPServers({
			dbServices: this.dbServices,
		});

		for (const webSocket of ctx.getWebSockets()) {
			const meta = webSocket.deserializeAttachment() || {
				userId: "unknown",
				activeRoomId: null,
			};
			this.sessions.set(webSocket, meta);
		}
	}

	async migrate() {
		try {
			console.log("migrating database in try block");
			await migrate(this.db, migrations);
			console.log("database migrated");
		} catch (error) {
			console.error("error migrating database", error);
		}
	}

	async delete() {
		this.storage.deleteAll();
	}

	async alarm() {
		await this.workflows.handleWorkflowAlarm();
		await this.workflows.scheduleNextWorkflowAlarm();
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
			activeRoomId: null,
		};
		server.serializeAttachment(session);
		this.sessions.set(server, session);

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(webSocket: WebSocket, message: string) {
		const session = this.sessions.get(webSocket);
		if (!session) {
			console.error("Session not found");
			webSocket.close(1011, "Session not found");
			return;
		}

		try {
			const parsedMsg: WsChatIncomingMessage = JSON.parse(message);
			console.log(
				"Got message from user: ",
				session.userId,
				"with message: ",
				parsedMsg,
			);
			switch (parsedMsg.type) {
				case "organization-init-request": {
					this.handleUserInitRequest(session);
					break;
				}
				case "chat-room-init-request": {
					this.chatRooms.handleChatRoomInitRequest(
						webSocket,
						session,
						parsedMsg.roomId,
					);
					break;
				}
				case "chat-room-thread-init-request": {
					this.chatRooms.handleChatRoomThreadInitRequest(
						webSocket,
						session,
						parsedMsg.roomId,
						parsedMsg.threadId,
					);
					break;
				}
				case "chat-room-message-send": {
					const roomId = parsedMsg.roomId;
					if (session.activeRoomId !== roomId) {
						console.warn(
							`[Auth] Denied: User ${session.userId} tried to send message to room ${roomId}, but session is active in ${session.activeRoomId}.`,
						);
						throw new Error(
							`Not authorized to send message to room ${roomId} from current session state.`,
						);
					}
					await this.chatRooms.processIncomingChatMessage({
						memberId: session.userId,
						roomId,
						message: parsedMsg.message,
						existingMessageId: null,
						notifyAgents: true,
					});
					break;
				}
				default:
					console.warn(
						`Received unhandled message type: ${
							// biome-ignore lint/suspicious/noExplicitAny: unknown message structure
							(parsedMsg as any)?.type
						}`,
					);
			}
		} catch (err) {
			console.error(
				`Error processing WebSocket message for user ${session.userId}:`,
				err,
			);
			if (err instanceof Error) {
				try {
					webSocket.send(
						JSON.stringify({ error: `Processing failed: ${err.message}` }),
					);
				} catch (sendErr) {
					console.error(
						`Failed to send error message back to user ${session.userId}:`,
						sendErr,
					);
					this.sessions.delete(webSocket);
					webSocket.close(
						1011,
						"Error processing message and failed to notify client",
					);
				}
			} else {
				try {
					webSocket.send(
						JSON.stringify({
							error: "An unknown error occurred during processing.",
						}),
					);
				} catch (sendErr) {
					console.error(
						`Failed to send generic error message back to user ${session.userId}:`,
						sendErr,
					);
					this.sessions.delete(webSocket);
					webSocket.close(1011, "Unknown error and failed to notify client");
				}
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

	// Shared methods as arrow functions for DI
	sendWebSocketMessageToUser = (
		message: WsChatOutgoingMessage,
		sentToUserId: string,
	) => {
		for (const [ws, session] of this.sessions.entries()) {
			if (session.userId === sentToUserId) {
				ws.send(JSON.stringify(message));
			}
		}
	};

	broadcastWebSocketMessageToRoom = (
		message: WsChatOutgoingMessage,
		targetRoomId: string,
	) => {
		//let recipients = 0;
		for (const [ws, session] of this.sessions.entries()) {
			if (session.activeRoomId === targetRoomId) {
				try {
					ws.send(JSON.stringify(message));
					//recipients++;
				} catch (e) {
					console.error(
						`Failed to send message to WebSocket for user ${session.userId} in room ${targetRoomId}:`,
						e,
					);
					this.sessions.delete(ws);
				}
			}
		}
		// console.log(
		// 	`Message broadcasted to ${recipients} recipients in room ${targetRoomId}.`,
		// );
	};

	handleUserInitRequest = async (session: Session) => {
		const chatRooms = await this.dbServices.getChatRoomsUserIsMemberOf(
			session.userId,
		);

		this.sendWebSocketMessageToUser(
			{
				type: "organization-init-response",
				chatRooms,
			},
			session.userId,
		);
	};

	// Wrapper methods for circular dependencies
	private processIncomingChatMessage = async (
		params: Parameters<ChatRooms["processIncomingChatMessage"]>[0],
	) => {
		return this.chatRooms.processIncomingChatMessage(params);
	};

	private routeWorkflowToRelevantAgent = async (params: {
		workflow: WorkflowPartial;
	}) => {
		return this.agents.routeWorkflowToRelevantAgent(params);
	};

	private routeMessagesToRelevantAgents = async (message: ChatRoomMessage) => {
		return this.agents.routeMessageToRelevantAgents(message);
	};

	private createWorkflow = async (
		params: Parameters<ChatRoomDbServices["createAgentWorkflow"]>[0],
	) => {
		return this.workflows.createWorkflow(params);
	};

	private createDocument = async (
		params: Parameters<ChatRoomDbServices["createDocument"]>[0],
	) => {
		return this.documents.createDocument(params);
	};

	// RPC services

	async createChatRoom(
		newChatRoom: Parameters<ChatRoomDbServices["createChatRoom"]>[0],
	) {
		return this.chatRooms.createChatRoom(newChatRoom);
	}

	async deleteChatRoomMember(
		deleteChatRoomMemberParams: Parameters<
			typeof this.dbServices.deleteChatRoomMember
		>[0],
	) {
		return this.chatRooms.deleteChatRoomMember(deleteChatRoomMemberParams);
	}

	async addChatRoomMember(
		addChatRoomMemberParams: Parameters<
			typeof this.dbServices.addChatRoomMember
		>[0],
	) {
		return this.chatRooms.addChatRoomMember(addChatRoomMemberParams);
	}

	async getAgents() {
		return await this.dbServices.getAgents();
	}

	async createAgent(
		newAgent: Parameters<typeof this.dbServices.createAgent>[0],
	) {
		return await this.dbServices.createAgent(newAgent);
	}

	async getAgentById(id: string) {
		return await this.dbServices.getAgentById(id);
	}

	async getAgentsByIds(ids: string[]) {
		return await this.dbServices.getAgentsByIds(ids);
	}

	async updateAgent(
		id: string,
		agentUpdates: Parameters<typeof this.dbServices.updateAgent>[1],
	) {
		return await this.dbServices.updateAgent(id, agentUpdates);
	}

	async deleteWorkflow(workflowId: string) {
		return await this.workflows.deleteWorkflow(workflowId);
	}

	async deleteDocument(documentId: string) {
		return await this.documents.deleteDocument(documentId);
	}

	async getMcpServers() {
		return await this.mcpServers.getMcpServers();
	}

	async createMcpServer(
		data: Parameters<typeof this.mcpServers.createMcpServer>[0],
	) {
		return await this.mcpServers.createMcpServer(data);
	}

	async updateMcpServer(
		id: string,
		data: Parameters<typeof this.mcpServers.updateMcpServer>[1],
	) {
		return await this.mcpServers.updateMcpServer(id, data);
	}

	async deleteMcpServer(id: string) {
		return await this.mcpServers.deleteMcpServer(id);
	}
}
