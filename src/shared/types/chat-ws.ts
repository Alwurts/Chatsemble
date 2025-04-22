import type {
	ChatRoom,
	ChatRoomMember,
	ChatRoomMessage,
	ChatRoomMessagePartial,
} from "@shared/types/chat";
import type { Workflow } from "@shared/types/workflow";
import type { Document } from "@shared/types/document";

export type WsMessageOrganizationInitRequest = {
	type: "organization-init-request";
};

export type WsMessageChatRoomInitRequest = {
	type: "chat-room-init-request";
	roomId: string;
};

export type WsMessageChatRoomThreadInitRequest = {
	type: "chat-room-thread-init-request";
	roomId: string;
	threadId: number;
};

export type WsMessageChatRoomMessageSend = {
	type: "chat-room-message-send";
	roomId: string;
	threadId: number | null;
	message: ChatRoomMessagePartial;
};

export type WsChatIncomingMessage =
	| WsMessageOrganizationInitRequest
	| WsMessageChatRoomInitRequest
	| WsMessageChatRoomMessageSend
	| WsMessageChatRoomThreadInitRequest;

export type WsMessageOrganizationInitResponse = {
	type: "organization-init-response";
	chatRooms: ChatRoom[];
};

export type WsMessageChatRoomInitResponse = {
	type: "chat-room-init-response";
	roomId: string;
	messages: ChatRoomMessage[];
	members: ChatRoomMember[];
	room: ChatRoom;
	workflows: Workflow[];
	documents: Document[];
};

export type WsMessageChatRoomThreadInitResponse = {
	type: "chat-room-thread-init-response";
	roomId: string;
	threadId: number;
	threadMessage: ChatRoomMessage;
	messages: ChatRoomMessage[];
};

export type WsMessageChatRoomsUpdate = {
	type: "chat-rooms-update";
	chatRooms: ChatRoom[];
};

export type WsMessageChatRoomMessageBroadcast = {
	type: "chat-room-message-broadcast";
	roomId: string;
	threadId: number | null;
	message: ChatRoomMessage;
};

export type WsMessageChatRoomWorkflowsUpdate = {
	type: "chat-room-workflows-update";
	roomId: string;
	workflows: Workflow[];
};

export type WsMessageChatRoomMembersUpdate = {
	type: "chat-room-members-update";
	roomId: string;
	members: ChatRoomMember[];
};

export type WsMessageChatRoomDocumentsUpdate = {
	type: "chat-room-documents-update";
	roomId: string;
	documents: Document[];
};

export type WsChatOutgoingMessage =
	| WsMessageOrganizationInitResponse
	| WsMessageChatRoomsUpdate
	| WsMessageChatRoomInitResponse
	| WsMessageChatRoomMessageBroadcast
	| WsMessageChatRoomThreadInitResponse
	| WsMessageChatRoomWorkflowsUpdate
	| WsMessageChatRoomMembersUpdate
	| WsMessageChatRoomDocumentsUpdate;

export type WsChatMessage = WsChatIncomingMessage | WsChatOutgoingMessage;
