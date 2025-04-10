import { db } from "@server/db";
import * as globalSchema from "@server/db/schema";
import { and, eq } from "drizzle-orm";

export async function getChatRoomMember(params: {
	chatRoomId: string;
	memberId: string;
}) {
	const roomMember = await db
		.select()
		.from(globalSchema.chatRoomMember)
		.where(
			and(
				eq(globalSchema.chatRoomMember.memberId, params.memberId),
				eq(globalSchema.chatRoomMember.roomId, params.chatRoomId),
			),
		)
		.limit(1)
		.get();

	return roomMember ?? null;
}
