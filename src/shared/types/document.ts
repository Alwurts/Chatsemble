import type { ChatRoomMemberType } from "./chat";

export type Document = {
	id: string;
	roomId: string;
	title: string;
	content: string;
	createdAt: number;
	createdByMemberId: string;
	createdByMemberType: ChatRoomMemberType;
};
