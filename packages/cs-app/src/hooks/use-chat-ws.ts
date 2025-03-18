import type {
	ChatInputValue,
	ChatRoom,
	ChatRoomMember,
	ChatRoomMessage,
	ChatRoomMessagePartial,
	WsChatIncomingMessage,
	WsChatOutgoingMessage,
	WsMessageChatInitRequest,
	WsMessageSend,
	WsMessageThreadInitRequest,
} from "@/cs-shared";
import type { User } from "better-auth";
import { customAlphabet } from "nanoid";
import { useCallback, useEffect, useReducer, useRef } from "react";

// Define the chat state interface with separate message collections
interface ChatState {
	topLevelMessages: {
		data: ChatRoomMessage[];
		status: "idle" | "loading" | "success" | "error";
	};
	// Track active thread with its own messages and status
	activeThread: {
		id: number | null;
		threadMessage: ChatRoomMessage | null;
		messages: ChatRoomMessage[];
		status: "idle" | "loading" | "success" | "error";
	};
	members: ChatRoomMember[];
	room: ChatRoom | null;
	connectionStatus: "disconnected" | "connecting" | "connected" | "ready";
}

// Initial state for the chat reducer
const initialChatState: ChatState = {
	topLevelMessages: {
		data: [],
		status: "idle",
	},
	activeThread: {
		id: null,
		threadMessage: null,
		messages: [],
		status: "idle",
	},
	members: [],
	room: null,
	connectionStatus: "disconnected",
};

// Define action types
type ChatAction =
	| { type: "SET_CONNECTION_STATUS"; status: ChatState["connectionStatus"] }
	| { type: "SET_TOP_LEVEL_MESSAGES"; messages: ChatRoomMessage[] }
	| { type: "ADD_MESSAGE"; addAsNew?: boolean; message: ChatRoomMessage }
	| {
			type: "SET_THREAD_MESSAGES";
			threadMessage: ChatRoomMessage;
			messages: ChatRoomMessage[];
	  }
	| {
			type: "SET_ACTIVE_THREAD";
			threadId: number | null;
			threadMessage: ChatRoomMessage | null;
	  }
	| { type: "SET_MEMBERS"; members: ChatRoomMember[] }
	| { type: "SET_ROOM"; room: ChatRoom }
	| { type: "RESET_STATE" };

// Chat reducer function
function chatReducer(state: ChatState, action: ChatAction): ChatState {
	switch (action.type) {
		case "SET_CONNECTION_STATUS":
			return { ...state, connectionStatus: action.status };

		case "ADD_MESSAGE": {
			const { message: newMessage, addAsNew = false } = action;
			console.log("[ADD_MESSAGE] newMessage", newMessage);

			if (
				newMessage.threadId === null &&
				state.topLevelMessages.status === "success"
			) {
				// Top-level message

				const updatedMessages = updateMessageList({
					messages: state.topLevelMessages.data,
					newMessage,
					addAsNew,
				});
				return {
					...state,
					topLevelMessages: {
						...state.topLevelMessages,
						data: updatedMessages,
					},
				};
			}
			if (
				newMessage.threadId === state.activeThread.id &&
				state.activeThread.status === "success"
			) {
				// Thread message for the active thread
				const updatedThreadMessages = updateMessageList({
					messages: state.activeThread.messages,
					newMessage,
					addAsNew,
				});
				return {
					...state,
					activeThread: {
						...state.activeThread,
						messages: updatedThreadMessages,
					},
				};
			}
			// If it's a thread message for a different thread, don't update
			return state;
		}

		case "SET_TOP_LEVEL_MESSAGES":
			return {
				...state,
				topLevelMessages: {
					...state.topLevelMessages,
					data: action.messages,
					status: "success",
				},
			};

		case "SET_THREAD_MESSAGES": {
			if (action.threadMessage.id === state.activeThread.id) {
				return {
					...state,
					activeThread: {
						...state.activeThread,
						threadMessage: action.threadMessage,
						messages: action.messages,
						status: "success",
					},
				};
			}
			return state;
		}

		case "SET_ACTIVE_THREAD":
			return {
				...state,
				activeThread: {
					id: action.threadId,
					threadMessage: action.threadMessage,
					messages: [], // Clear messages when changing threads
					status: action.threadId !== null ? "loading" : "idle",
				},
			};

		case "SET_MEMBERS":
			return { ...state, members: action.members };

		case "SET_ROOM":
			return { ...state, room: action.room };

		case "RESET_STATE":
			return initialChatState;

		default:
			return state;
	}
}

function updateMessageList({
	messages,
	newMessage,
	addAsNew,
}: {
	messages: ChatRoomMessage[];
	newMessage: ChatRoomMessage;
	addAsNew?: boolean;
}): ChatRoomMessage[] {
	if (addAsNew) {
		return [...messages, newMessage];
	}

	const optimisticId = newMessage.metadata.optimisticData?.id;
	if (optimisticId) {
		const existingOptimisticIndex = messages.findIndex(
			(message) => message.id === optimisticId,
		);
		if (existingOptimisticIndex >= 0) {
			console.log("[updateMessageList] optimisticId", optimisticId);
			const updatedMessages = [...messages];
			updatedMessages[existingOptimisticIndex] = newMessage;
			return updatedMessages;
		}
	}

	const existingMessageIndex = messages.findIndex(
		(message) => message.id === newMessage.id,
	);
	if (existingMessageIndex >= 0) {
		console.log(
			"[updateMessageList] existingMessageIndex",
			existingMessageIndex,
		);
		const updatedMessages = [...messages];
		updatedMessages[existingMessageIndex] = newMessage;
		return updatedMessages;
	}
	console.log("[updateMessageList] newMessage", newMessage);

	return [...messages, newMessage];
}

export interface UseChatWSProps {
	roomId: string | null;
	threadId: number | null;
	user: User;
}

export function useChatWS({ roomId, threadId, user }: UseChatWSProps) {
	const wsRef = useRef<WebSocket | null>(null);
	const [state, dispatch] = useReducer(chatReducer, initialChatState);
	// Keep a ref to the current active thread ID to avoid closure issues
	const activeThreadIdRef = useRef<number | null>(null);

	// Handler for WebSocket messages
	const handleWebSocketMessage = useCallback(
		(event: MessageEvent) => {
			try {
				const wsMessage: WsChatOutgoingMessage = JSON.parse(event.data);

				switch (wsMessage.type) {
					case "message-broadcast": {
						const newMessage = wsMessage.message;
						console.log("[handleWebSocketMessage] newMessage", newMessage);
						dispatch({
							type: "ADD_MESSAGE",
							message: newMessage,
						});

						break;
					}
					case "member-update": {
						const newMembers = wsMessage.members;
						dispatch({ type: "SET_MEMBERS", members: newMembers });
						break;
					}
					case "chat-init-response": {
						console.log(
							"chat-init-response",
							JSON.parse(JSON.stringify(wsMessage)),
						);
						dispatch({ type: "SET_CONNECTION_STATUS", status: "ready" });
						dispatch({
							type: "SET_TOP_LEVEL_MESSAGES",
							messages: wsMessage.messages,
						});
						dispatch({ type: "SET_MEMBERS", members: wsMessage.members });
						dispatch({ type: "SET_ROOM", room: wsMessage.room });
						break;
					}
					case "thread-init-response": {
						// Only update if this response is for the current active thread

						dispatch({
							type: "SET_THREAD_MESSAGES",
							threadMessage: wsMessage.threadMessage,
							messages: wsMessage.messages,
						});

						break;
					}
				}
			} catch (error) {
				console.error("Failed to parse message:", error);
			}
		},
		[], // No dependencies needed since we use the ref
	);

	// Start WebSocket connection
	const startWebSocket = useCallback(
		(roomId: string | null) => {
			if (!roomId) {
				dispatch({ type: "SET_CONNECTION_STATUS", status: "disconnected" });
				return;
			}

			dispatch({ type: "SET_CONNECTION_STATUS", status: "connecting" });

			const apiHost =
				process.env.NEXT_PUBLIC_DO_CHAT_API_HOST?.replace(/^https?:\/\//, "") ??
				"";
			const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
			const ws = new WebSocket(
				`${wsProtocol}://${apiHost}/websocket/chat-rooms/${roomId}`,
			);

			ws.onopen = () => {
				console.log("WebSocket connected");
				dispatch({ type: "SET_CONNECTION_STATUS", status: "connected" });

				// Initialize by requesting top-level messages
				const wsMessage: WsMessageChatInitRequest = {
					type: "chat-init-request",
				};
				sendWsMessage(wsMessage);
			};

			ws.onmessage = handleWebSocketMessage;

			ws.onerror = (error) => {
				console.error("WebSocket error:", error);
				dispatch({ type: "SET_CONNECTION_STATUS", status: "disconnected" });
			};

			ws.onclose = () => {
				dispatch({ type: "SET_CONNECTION_STATUS", status: "disconnected" });
				console.log("WebSocket closed");
			};

			wsRef.current = ws;
		},
		[handleWebSocketMessage],
	);

	// Initialize WebSocket connection when roomId changes
	useEffect(() => {
		// Close any existing connection
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}

		// Reset state when roomId changes
		dispatch({ type: "RESET_STATE" });
		activeThreadIdRef.current = null; // Reset the ref as well

		if (roomId) {
			startWebSocket(roomId);
		}

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, [roomId, startWebSocket]);

	const sendWsMessage = useCallback((message: WsChatIncomingMessage) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
		} else {
			console.error("WebSocket is not connected");
		}
	}, []);

	// Handle thread ID changes from props
	useEffect(() => {
		// We need to update the thread if either:
		// 1. The threadId has changed
		// 2. Connection status changes to 'ready' while we have an active threadId
		const threadIdChanged = threadId !== activeThreadIdRef.current;
		const connectionBecameReady =
			state.connectionStatus === "ready" &&
			threadId !== null &&
			state.activeThread.status !== "success";

		if (threadIdChanged) {
			activeThreadIdRef.current = threadId;
			console.log(
				"messages",
				JSON.parse(JSON.stringify(state.topLevelMessages.data)),
			);
			const threadMessage =
				state.topLevelMessages.data.find(
					(message) => message.id === threadId,
				) ?? null;
			console.log("threadMessage", JSON.parse(JSON.stringify(threadMessage)));
			dispatch({ type: "SET_ACTIVE_THREAD", threadId, threadMessage });
		}

		// If we have a thread ID and an active connection, fetch thread messages
		// This runs when threadId changes OR when connection becomes ready with an existing threadId
		if (
			(threadIdChanged || connectionBecameReady) &&
			threadId &&
			state.connectionStatus === "ready"
		) {
			const wsMessage: WsMessageThreadInitRequest = {
				type: "thread-init-request",
				threadId,
			};
			sendWsMessage(wsMessage);
		}
	}, [
		threadId,
		sendWsMessage,
		state.connectionStatus,
		state.activeThread.status,
		state.topLevelMessages.data,
	]);

	const handleSubmit = useCallback(
		async ({
			value,
			threadId,
		}: { value: ChatInputValue; threadId: number | null }) => {
			console.log("[handleSubmit] threadId", threadId);
			if (!value.content.trim() || !roomId) {
				return;
			}

			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				console.error("WebSocket is not connected");
				return;
			}

			const newMessagePartial: ChatRoomMessagePartial = {
				id: Number(customAlphabet("0123456789", 20)()),
				content: value.content,
				mentions: value.mentions,
				toolUses: [],
				createdAt: Date.now(),
				threadId,
			};

			console.log("[handleSubmit] newMessagePartial", newMessagePartial);

			const wsMessage: WsMessageSend = {
				type: "message-send",
				message: newMessagePartial,
			};

			sendWsMessage(wsMessage);

			const newMessage: ChatRoomMessage = {
				...newMessagePartial,
				member: {
					id: user.id,
					roomId: roomId,
					name: user.name,
					type: "user",
					role: "member",
					email: user.email,
					image: user.image,
				},
				metadata: {
					optimisticData: {
						createdAt: newMessagePartial.createdAt,
						id: newMessagePartial.id,
					},
				},
			};

			console.log("[handleSubmit] newMessage", newMessage);

			dispatch({
				type: "ADD_MESSAGE",
				addAsNew: true,
				message: newMessage,
			});
		},
		[roomId, sendWsMessage, user],
	);

	return {
		topLevelMessages: state.topLevelMessages,
		activeThread: state.activeThread,
		members: state.members,
		room: state.room,
		connectionStatus: state.connectionStatus,
		handleSubmit,
	};
}
