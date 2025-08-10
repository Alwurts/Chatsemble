import type { User } from "better-auth";
import { useWebSocket } from "../use-web-socket";
import { useMainChatRoomState } from "./use-main-chat-room-state";
import { useOrganizationState } from "./use-organization-state";
import { useThreadChatRoomState } from "./use-thread-chat-room-state";

export interface UseOrganizationConnectionProps {
	organizationId: string;
	roomId: string | null;
	threadId: number | null;
	user: User;
}

export function useOrganizationConnection({
	organizationId,
	roomId,
	threadId,
	user,
}: UseOrganizationConnectionProps) {
	const { sendMessage, connectionStatus } = useWebSocket({
		organizationId,
		onMessage: (message) => {
			organizationState.handleMessage(message);
			mainChatRoomState.handleMessage(message);
			chatRoomThreadState.handleMessage(message);
		},
	});

	const organizationState = useOrganizationState({
		sendMessage,
		connectionStatus,
	});

	const mainChatRoomState = useMainChatRoomState({
		roomId,
		user,
		sendMessage,
		connectionStatus,
	});

	const chatRoomThreadState = useThreadChatRoomState({
		roomId,
		threadId,
		user,
		topLevelMessages: mainChatRoomState.messages,
		sendMessage,
		connectionStatus,
	});

	return {
		connectionStatus,
		organizationState,
		mainChatRoomState,
		chatRoomThreadState,
	};
}
