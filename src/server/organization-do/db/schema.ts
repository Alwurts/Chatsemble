import type {
	ChatMentions,
	ChatMessageMetadata,
	ChatMessageStatus,
	ChatMessageThreadMetadata,
	ChatRoomMemberRole,
	ChatRoomMemberType,
	ChatRoomMessagePartial,
	ChatRoomType,
	EmojiUsage,
	LanguageStyle,
	Tone,
	Verbosity,
	WorkflowSteps,
} from "@shared/types";
import { sql } from "drizzle-orm";
import {
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

// TODO: Check if i should index some things

export const chatRoom = sqliteTable("chat_room", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(36)),
	name: text("name").notNull(),
	type: text("type").$type<ChatRoomType>().notNull(),
	organizationId: text("organization_id").notNull(),
	createdAt: integer("created_at", { mode: "number" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
});

export const chatRoomMember = sqliteTable(
	"chat_room_member",
	{
		id: text("id").notNull(), // User ID or Agent ID
		roomId: text("room_id")
			.notNull()
			.references(() => chatRoom.id, { onDelete: "cascade" }),
		type: text("type").$type<ChatRoomMemberType>().notNull(),
		role: text("role").$type<ChatRoomMemberRole>().notNull(),
		name: text("name").notNull(),
		email: text("email").notNull(),
		image: text("image"),
		createdAt: integer("created_at", { mode: "number" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => [primaryKey({ columns: [t.roomId, t.id] })],
);

export const chatMessage = sqliteTable("chat_message", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	status: text("status").$type<ChatMessageStatus>().notNull(),
	mentions: text("mentions", { mode: "json" }).$type<ChatMentions>().notNull(),
	parts: text("parts", { mode: "json" })
		.$type<ChatRoomMessagePartial["parts"]>() // TODO: Add versioning to columns that are json type
		.notNull()
		.default(sql`('[]')`),
	memberId: text("member_id").notNull(),
	createdAt: integer("created_at", { mode: "number" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	metadata: text("metadata", { mode: "json" })
		.$type<ChatMessageMetadata>()
		.notNull(),
	threadMetadata: text("thread_metadata", {
		mode: "json",
	}).$type<ChatMessageThreadMetadata>(),
	roomId: text("room_id")
		.notNull()
		.references(() => chatRoom.id, { onDelete: "cascade" }),
	threadId: integer("thread_id"),
});

export const agent = sqliteTable("agent", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(36)),
	email: text("email").notNull().unique(),
	// Identity
	name: text("name").notNull(),
	image: text("image").notNull(),
	description: text("description").notNull(),
	// Personality
	tone: text("tone").$type<Tone>().notNull(),
	verbosity: text("verbosity").$type<Verbosity>().notNull(),
	emojiUsage: text("emoji_usage").$type<EmojiUsage>().notNull(),
	languageStyle: text("language_style").$type<LanguageStyle>().notNull(),
	// Metadata
	createdAt: integer("created_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export const workflows = sqliteTable("workflows", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(36)), // Workflow unique ID
	agentId: text("agent_id").notNull(),
	chatRoomId: text("chat_room_id")
		.notNull()
		.references(() => chatRoom.id, { onDelete: "cascade" }),
	goal: text("goal").notNull(),
	steps: text("steps", { mode: "json" }).$type<WorkflowSteps>().notNull(),
	scheduleExpression: text("schedule_expression").notNull(), // e.g., CRON or ISO
	nextExecutionTime: integer("next_execution_time").notNull(), // Timestamp ms
	lastExecutionTime: integer("last_execution_time"), // Timestamp ms
	isActive: integer("is_active", { mode: "boolean" }).notNull(),
	isRecurring: integer("is_recurring", { mode: "boolean" }).notNull(),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch() * 1000)`),
	updatedAt: integer("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export const document = sqliteTable("document", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(36)),
	roomId: text("room_id")
		.notNull()
		.references(() => chatRoom.id, { onDelete: "no action" }),
	title: text("title").notNull(),
	content: text("content").notNull(),
	createdAt: integer("created_at", { mode: "number" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	createdByMemberId: text("created_by_member_id").notNull(),
	createdByMemberType: text("created_by_member_type")
		.$type<ChatRoomMemberType>()
		.notNull(),
});
