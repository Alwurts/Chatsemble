import type { Session } from "@server/types/session";
import type {
	ChatRoomMessage,
	ChatRoomMessagePartial,
	WsChatOutgoingMessage,
} from "@shared/types";
import type { ChatRoomDbServices } from "./db/services";

interface ChatRoomsDependencies {
	dbServices: ChatRoomDbServices;
	sessions: Map<WebSocket, Session>;
	sendWebSocketMessageToUser: (
		message: WsChatOutgoingMessage,
		userId: string,
	) => void;
	broadcastWebSocketMessageToRoom: (
		message: WsChatOutgoingMessage,
		roomId: string,
	) => void;
	routeMessagesToRelevantAgents: (message: ChatRoomMessage) => Promise<void>;
}

export class ChatRooms {
	private deps: ChatRoomsDependencies;

	constructor(deps: ChatRoomsDependencies) {
		this.deps = deps;
	}

	handleChatRoomInitRequest = async (
		webSocket: WebSocket,
		session: Session,
		roomId: string,
	) => {
		const isMember = await this.deps.dbServices.isUserMemberOfRoom({
			roomId,
			userId: session.userId,
		});

		console.log("isMember", isMember);

		if (!isMember) {
			console.warn(
				`User ${session.userId} attempted to access room ${roomId} but is not a member.`,
			);
			if (session.activeRoomId !== null) {
				const newSession = { ...session, activeRoomId: null };
				webSocket.serializeAttachment(newSession);
				this.deps.sessions.set(webSocket, newSession);
			}
			return;
		}

		console.log("roomId", roomId);

		const room = await this.deps.dbServices.getChatRoomById(roomId);

		console.log("room", room);

		const members = await this.deps.dbServices.getChatRoomMembers({ roomId });
		console.log("members", members);
		const messages = await this.deps.dbServices.getChatRoomMessages({
			roomId,
			threadId: null,
		});
		console.log("messages", messages);
		const workflows = await this.deps.dbServices.getChatRoomWorkflows(roomId);
		console.log("workflows", workflows);
		const documents = await this.deps.dbServices.getChatRoomDocuments(roomId);
		console.log("documents", documents);

		if (!room) {
			console.error("Room not found");
			throw new Error("Room not found");
		}

		const newSession = { ...session, activeRoomId: roomId };

		console.log("newSession", newSession);

		webSocket.serializeAttachment(newSession);
		this.deps.sessions.set(webSocket, newSession);

		console.log("sent message");

		this.deps.sendWebSocketMessageToUser(
			{
				type: "chat-room-init-response",
				roomId,
				messages,
				members,
				room,
				workflows,
				documents,
			},
			session.userId,
		);
	};

	handleChatRoomThreadInitRequest = async (
		webSocket: WebSocket,
		session: Session,
		roomId: string,
		threadId: number,
	) => {
		const isMember = await this.deps.dbServices.isUserMemberOfRoom({
			roomId,
			userId: session.userId,
		});

		if (!isMember) {
			console.warn(
				`User ${session.userId} attempted to access room ${roomId} but is not a member.`,
			);
			if (session.activeRoomId !== null) {
				const newSession = { ...session, activeRoomId: null };
				webSocket.serializeAttachment(newSession);
				this.deps.sessions.set(webSocket, newSession);
			}
			return; // Stop processing
		}

		if (session.activeRoomId !== roomId) {
			const newSession = { ...session, activeRoomId: roomId };

			webSocket.serializeAttachment(newSession);
			this.deps.sessions.set(webSocket, newSession);
		}

		const [threadMessage, messages] = await Promise.all([
			this.deps.dbServices.getChatRoomMessageById(threadId),
			this.deps.dbServices.getChatRoomMessages({
				roomId,
				threadId,
			}),
		]);

		if (!threadMessage) {
			console.error("Thread message not found");
			throw new Error("Thread message not found");
		}

		this.deps.sendWebSocketMessageToUser(
			{
				type: "chat-room-thread-init-response",
				roomId,
				threadId,
				threadMessage,
				messages,
			},
			session.userId,
		);
	};

	/**
	 * Process an incoming chat message
	 * @param memberId - The ID of the member who sent the message
	 * @param roomId - The ID of the room the message is in
	 * @param message - The message to process
	 * @param existingMessageId - The ID of the existing message to update used when streaming
	 * @param notifyAgents - Whether to notify agents about the message
	 * @returns The processed chat room message
	 */
	processIncomingChatMessage = async ({
		memberId,
		roomId,
		message,
		existingMessageId,
		notifyAgents,
	}: {
		memberId: string;
		roomId: string;
		message: ChatRoomMessagePartial;
		existingMessageId: number | null;
		notifyAgents: boolean;
	}) => {
		let chatRoomMessage: ChatRoomMessage;

		if (existingMessageId) {
			chatRoomMessage = await this.deps.dbServices.updateChatRoomMessage(
				existingMessageId,
				{
					parts: message.parts,
					mentions: message.mentions,
					status: message.status,
				},
			);
		} else {
			chatRoomMessage = await this.deps.dbServices.insertChatRoomMessage({
				memberId,
				parts: message.parts,
				mentions: message.mentions,
				status: message.status,
				threadId: message.threadId,
				roomId,
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
					await this.deps.dbServices.updateChatRoomMessageThreadMetadata(
						message.threadId,
						chatRoomMessage,
					);

				this.deps.broadcastWebSocketMessageToRoom(
					{
						type: "chat-room-message-broadcast",
						roomId,
						threadId: updatedThreadMessage.threadId,
						message: updatedThreadMessage,
					},
					roomId,
				);
			}
		}

		this.deps.broadcastWebSocketMessageToRoom(
			{
				type: "chat-room-message-broadcast",
				roomId,
				threadId: chatRoomMessage.threadId,
				message: chatRoomMessage,
			},
			roomId,
		);

		if (notifyAgents && !existingMessageId) {
			await this.deps.routeMessagesToRelevantAgents(chatRoomMessage);
		}

		return chatRoomMessage;
	};

	private sendChatRoomsUpdateToUsers = async (userIds: string[]) => {
		const chatRoomsPromises = userIds.map((userId) =>
			this.deps.dbServices.getChatRoomsUserIsMemberOf(userId),
		);
		const chatRoomsResults = await Promise.all(chatRoomsPromises);

		userIds.forEach((userId, index) => {
			this.deps.sendWebSocketMessageToUser(
				{
					type: "chat-rooms-update",
					chatRooms: chatRoomsResults[index],
				},
				userId,
			);
		});
	};

	private broadcastChatRoomMembersUpdate = async (chatRoomId: string) => {
		const members = await this.deps.dbServices.getChatRoomMembers({
			roomId: chatRoomId,
		});

		this.deps.broadcastWebSocketMessageToRoom(
			{
				type: "chat-room-members-update",
				roomId: chatRoomId,
				members,
			},
			chatRoomId,
		);
	};

	// Chat room services

	createChatRoom = async (
		newChatRoom: Parameters<ChatRoomDbServices["createChatRoom"]>[0],
	) => {
		const createdChatRoom =
			await this.deps.dbServices.createChatRoom(newChatRoom);

		const membersIds = newChatRoom.members
			.filter((member) => member.type === "user")
			.map((member) => member.id);

		this.sendChatRoomsUpdateToUsers(membersIds);

		return createdChatRoom;
	};

	// Chat room member services

	deleteChatRoomMember = async (
		deleteChatRoomMemberParams: Parameters<
			ChatRoomDbServices["deleteChatRoomMember"]
		>[0],
	) => {
		const deletedChatRoomMember =
			await this.deps.dbServices.deleteChatRoomMember(
				deleteChatRoomMemberParams,
			);

		this.sendChatRoomsUpdateToUsers([deleteChatRoomMemberParams.memberId]);

		this.broadcastChatRoomMembersUpdate(deleteChatRoomMemberParams.roomId);

		return deletedChatRoomMember;
	};

	addChatRoomMember = async (
		addChatRoomMemberParams: Parameters<
			ChatRoomDbServices["addChatRoomMember"]
		>[0],
	) => {
		const addedChatRoomMember = await this.deps.dbServices.addChatRoomMember(
			addChatRoomMemberParams,
		);

		this.sendChatRoomsUpdateToUsers([addChatRoomMemberParams.id]);

		this.broadcastChatRoomMembersUpdate(addChatRoomMemberParams.roomId);

		return addedChatRoomMember;
	};
}
