import { zValidator } from "@hono/zod-validator";
import { db } from "@server/db";
import * as globalSchema from "@server/db/schema";
import type { HonoContextWithAuth } from "@server/types/hono";
import { createChatRoomSchema } from "@shared/types";
import { inArray } from "drizzle-orm";
import { Hono } from "hono";

const chatRoom = new Hono<HonoContextWithAuth>().post(
	"/",
	zValidator("json", createChatRoomSchema),
	async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const user = c.get("user");
		const session = c.get("session");
		const { activeOrganizationId } = session;
		const { name, members } = c.req.valid("json");

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		// Prepare members
		const newMembersWithoutCurrentUser = members.filter(
			(member) => member.id !== user.id,
		);

		const newUserMembers = newMembersWithoutCurrentUser.filter(
			(member) => member.type === "user",
		);

		const newAgentMembers = newMembersWithoutCurrentUser.filter(
			(member) => member.type === "agent",
		);

		const newOwnerChatRoomMember = {
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			role: "owner" as const,
			type: "user" as const,
		};

		const [newUserMemberDetails, newAgentMemberDetails] = await Promise.all([
			db
				.select()
				.from(globalSchema.user)
				.where(
					inArray(
						globalSchema.user.id,
						newUserMembers.map((member) => member.id),
					),
				),
			organizationDo.getAgentsByIds(newAgentMembers.map((member) => member.id)),
		]);

		const membersToAddDetailsPartial = [
			newOwnerChatRoomMember,
			...newUserMemberDetails.map((member) => ({
				id: member.id,
				name: member.name,
				email: member.email,
				image: member.image,
				role: "member" as const,
				type: "user" as const,
			})),
			...newAgentMemberDetails.map((member) => ({
				id: member.id,
				name: member.name,
				email: member.email,
				image: member.image,
				role: "member" as const,
				type: "agent" as const,
			})),
		];

		try {
			const newChatRoom = await organizationDo.createChatRoom({
				newChatRoom: {
					name,
					type: "public",
					organizationId: activeOrganizationId,
				},
				members: membersToAddDetailsPartial,
			});

			return c.json({ roomId: newChatRoom.id });
		} catch (error) {
			console.error(error);
			return c.json({ error: "Failed to create chat room" }, 500);
		}
	},
);

export default chatRoom;
