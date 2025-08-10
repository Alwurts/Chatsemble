import type { UseWebSocketConnectionStatus } from "@client/hooks/use-web-socket";
import { updateMessageList } from "@client/lib/chat";
import {
	createChatRoomMessagePartial,
	createChatRoomOptimisticMessage,
} from "@shared/lib/chat";
import type {
	ChatInputValue,
	ChatRoomMessage,
	WsChatIncomingMessage,
	WsChatOutgoingMessage,
	WsMessageChatRoomMessageSend,
	WsMessageChatRoomThreadInitRequest,
} from "@shared/types";
import type { User } from "better-auth";
import { useCallback, useEffect, useRef, useState } from "react";

export function useThreadChatRoomState({
	roomId,
	threadId,
	user,
	topLevelMessages,
	sendMessage,
	connectionStatus,
}: {
	roomId: string | null;
	threadId: number | null;
	user: User;
	topLevelMessages: ChatRoomMessage[];
	sendMessage: (message: WsChatIncomingMessage) => void;
	connectionStatus: UseWebSocketConnectionStatus;
}) {
	const [threadMessage, setThreadMessage] = useState<ChatRoomMessage | null>(
		null,
	);
	const [messages, setMessages] = useState<ChatRoomMessage[]>([]);
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading",
	);
	const isLoadingRef = useRef<boolean>(false);
	const activeThreadIdRef = useRef<number | null>(null);

	const handleMessage = useCallback(
		(wsMessage: WsChatOutgoingMessage) => {
			const currentActiveThreadId = activeThreadIdRef.current;
			if (currentActiveThreadId === null) {
				return;
			}

			switch (wsMessage.type) {
				case "chat-room-thread-init-response": {
					if (
						wsMessage.roomId === roomId &&
						wsMessage.threadId === currentActiveThreadId
					) {
						console.log(
							"Received chat-room-thread-init-response for active thread",
							wsMessage.threadId,
						);
						setThreadMessage(wsMessage.threadMessage);
						setMessages(wsMessage.messages);
						setStatus("success");
					}
					break;
				}
				case "chat-room-message-broadcast": {
					if (
						wsMessage.roomId === roomId &&
						wsMessage.message.id === currentActiveThreadId
					) {
						setThreadMessage(wsMessage.message);
					} else if (
						wsMessage.roomId === roomId &&
						wsMessage.message.threadId === currentActiveThreadId
					) {
						setMessages((prev) =>
							updateMessageList({
								messages: prev,
								newMessage: wsMessage.message,
							}),
						);
					}
					break;
				}
			}
		},
		[roomId],
	);

	const handleSubmit = useCallback(
		({ value }: { value: ChatInputValue }) => {
			if (
				!value.content.trim() ||
				!roomId ||
				connectionStatus !== "connected" ||
				threadId === null
			) {
				return;
			}

			const newMessagePartial = createChatRoomMessagePartial({
				parts: [
					{
						type: "text",
						text: value.content,
					},
				],
				mentions: value.mentions,
				status: "completed",
				threadId,
				roomId,
			});

			const wsMessage: WsMessageChatRoomMessageSend = {
				type: "chat-room-message-send",
				roomId,
				threadId: threadId ?? null,
				message: newMessagePartial,
			};

			sendMessage(wsMessage);

			const newMessage = createChatRoomOptimisticMessage({
				message: newMessagePartial,
				user,
				roomId,
			});

			setMessages((prev) =>
				updateMessageList({
					messages: prev,
					newMessage,
					addAsNew: true,
				}),
			);
		},
		[roomId, threadId, user, connectionStatus, sendMessage],
	);

	useEffect(() => {
		if (threadId === null) {
			setThreadMessage(null);
			setMessages([]);
			setStatus("loading");
			activeThreadIdRef.current = null;
			isLoadingRef.current = false;
		}
	}, [threadId]);

	useEffect(() => {
		const threadIdChanged = threadId !== activeThreadIdRef.current;

		if (threadIdChanged) {
			console.log(
				`Thread ID changed from ${activeThreadIdRef.current} to ${threadId}`,
			);
			activeThreadIdRef.current = threadId;
			const initialThreadMessage = topLevelMessages.find(
				(message) => message.id === threadId,
			);
			setThreadMessage(initialThreadMessage ?? null);
			setMessages([]);
			setStatus("loading");
			isLoadingRef.current = false;
		}

		const shouldFetch =
			threadId !== null &&
			roomId !== null &&
			connectionStatus === "connected" &&
			!isLoadingRef.current;

		const connectionBecameReadyForActiveThread =
			connectionStatus === "connected" &&
			threadId !== null &&
			activeThreadIdRef.current === threadId &&
			status !== "success" &&
			!isLoadingRef.current;

		if (
			shouldFetch &&
			(threadIdChanged || connectionBecameReadyForActiveThread)
		) {
			console.log(
				`Requesting thread init for roomId: ${roomId}, threadId: ${threadId}. Changed: ${threadIdChanged}, ConnReady: ${connectionBecameReadyForActiveThread}`,
			);

			isLoadingRef.current = true;
			setStatus("loading");

			const wsMessage: WsMessageChatRoomThreadInitRequest = {
				type: "chat-room-thread-init-request",
				roomId,
				threadId,
			};
			sendMessage(wsMessage);
		}

		if (status === "success" || status === "error") {
			if (activeThreadIdRef.current === threadId) {
				isLoadingRef.current = false;
			}
		}
	}, [
		threadId,
		roomId,
		sendMessage,
		connectionStatus,
		topLevelMessages,
		status,
	]);

	return {
		threadMessage,
		messages,
		status,
		handleSubmit,
		handleMessage,
	};
}
