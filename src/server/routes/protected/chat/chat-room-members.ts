import { zValidator } from "@hono/zod-validator";
import { db } from "@server/db";
import * as globalSchema from "@server/db/schema";
import type { HonoContextWithAuth } from "@server/types/hono";
import { createChatRoomMemberSchema } from "@shared/types";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

const chatRoomMembers = new Hono<HonoContextWithAuth>()
	.delete("/:chatRoomId/members/:memberId", async (c) => {
		const { ORGANIZATION_DURABLE_OBJECT } = c.env;
		const chatRoomId = c.req.param("chatRoomId");
		const memberId = c.req.param("memberId");
		const session = c.get("session");
		const { activeOrganizationId } = session;

		const organizationDoId =
			ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
		const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

		await organizationDo.deleteChatRoomMember({
			roomId: chatRoomId,
			memberId,
		});

		return c.json({ success: true });
	})
	.post(
		"/:chatRoomId/members",
		zValidator("json", createChatRoomMemberSchema),
		async (c) => {
			const { ORGANIZATION_DURABLE_OBJECT } = c.env;
			const chatRoomId = c.req.param("chatRoomId");
			const session = c.get("session");
			const { activeOrganizationId } = session;

			const { id, role, type } = c.req.valid("json");

			let member: {
				memberId: string;
				name: string;
				email: string;
				image: string | null;
			} | null = null;

			const organizationDoId =
				ORGANIZATION_DURABLE_OBJECT.idFromName(activeOrganizationId);
			const organizationDo = ORGANIZATION_DURABLE_OBJECT.get(organizationDoId);

			if (type === "user") {
				const result = await db
					.select({
						user: globalSchema.user,
					})
					.from(globalSchema.organizationMember)
					.innerJoin(
						globalSchema.user,
						eq(globalSchema.organizationMember.userId, globalSchema.user.id),
					)
					.where(
						and(
							eq(globalSchema.organizationMember.userId, id),
							eq(
								globalSchema.organizationMember.organizationId,
								activeOrganizationId,
							),
						),
					)
					.get();

				if (!result?.user) {
					throw new Error("User not found");
				}

				member = {
					memberId: result.user.id,
					name: result.user.name,
					email: result.user.email,
					image: result.user.image,
				};
			}

			if (type === "agent") {
				const agent = await organizationDo.getAgentById(id);

				if (!agent) {
					throw new Error("Agent not found");
				}

				member = {
					memberId: agent.id,
					name: agent.name,
					email: agent.email,
					image: agent.image,
				};
			}

			if (!member) {
				throw new Error("Member not found");
			}

			await organizationDo.addChatRoomMember({
				id: member.memberId,
				name: member.name,
				email: member.email,
				role,
				type,
				roomId: chatRoomId,
				image: member.image,
			});

			return c.json({ success: true });
		},
	);

export default chatRoomMembers;
