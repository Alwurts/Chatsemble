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
import type { MCPTransport } from "@shared/types/mcp";
import { sql } from "drizzle-orm";
import { primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

// TODO: Check if i should index some things

export const chatRoom = sqliteTable("chat_room", (t) => ({
	id: t
		.text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(36)),
	name: t.text("name").notNull(),
	type: t.text("type").$type<ChatRoomType>().notNull(),
	organizationId: t.text("organization_id").notNull(),
	createdAt: t
		.integer("created_at", { mode: "number" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
}));

export const chatRoomMember = sqliteTable(
	"chat_room_member",
	(t) => ({
		id: t.text("id").notNull(), // User ID or Agent ID
		roomId: t
			.text("room_id")
			.notNull()
			.references(() => chatRoom.id, { onDelete: "cascade" }),
		type: t.text("type").$type<ChatRoomMemberType>().notNull(),
		role: t.text("role").$type<ChatRoomMemberRole>().notNull(),
		name: t.text("name").notNull(),
		email: t.text("email").notNull(),
		image: t.text("image"),
		createdAt: t
			.integer("created_at", { mode: "number" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	}),
	(t) => [primaryKey({ columns: [t.roomId, t.id] })],
);

export const chatMessage = sqliteTable("chat_message", (t) => ({
	id: t.integer("id").primaryKey({ autoIncrement: true }),
	status: t
		.text("status")
		.$type<ChatMessageStatus>()
		.notNull()
		.default("completed"),
	mentions: t
		.text("mentions", { mode: "json" })
		.$type<ChatMentions>()
		.notNull(),
	parts: t
		.text("parts", { mode: "json" })
		.$type<ChatRoomMessagePartial["parts"]>() // TODO: Add versioning to columns that are json type
		.notNull()
		.default(sql`('[]')`),
	memberId: t.text("member_id").notNull(),
	createdAt: t
		.integer("created_at", { mode: "number" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	metadata: t
		.text("metadata", { mode: "json" })
		.$type<ChatMessageMetadata>()
		.notNull(),
	threadMetadata: t
		.text("thread_metadata", {
			mode: "json",
		})
		.$type<ChatMessageThreadMetadata>(),
	roomId: t
		.text("room_id")
		.notNull()
		.references(() => chatRoom.id, { onDelete: "cascade" }),
	threadId: t.integer("thread_id"),
}));

export const agent = sqliteTable("agent", (t) => ({
	id: t
		.text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(36)),
	email: t.text("email").notNull().unique(),
	// Identity
	name: t.text("name").notNull(),
	image: t.text("image").notNull(),
	description: t.text("description").notNull(),
	// Personality
	tone: t.text("tone").$type<Tone>().notNull(),
	verbosity: t.text("verbosity").$type<Verbosity>().notNull(),
	emojiUsage: t.text("emoji_usage").$type<EmojiUsage>().notNull(),
	languageStyle: t.text("language_style").$type<LanguageStyle>().notNull(),
	// Metadata
	createdAt: t
		.integer("created_at")
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
}));

export const workflows = sqliteTable("workflows", (t) => ({
	id: t
		.text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(36)), // Workflow unique ID
	agentId: t.text("agent_id").notNull(),
	chatRoomId: t
		.text("chat_room_id")
		.notNull()
		.references(() => chatRoom.id, { onDelete: "cascade" }),
	goal: t.text("goal").notNull(),
	steps: t.text("steps", { mode: "json" }).$type<WorkflowSteps>().notNull(),
	scheduleExpression: t.text("schedule_expression").notNull(), // e.g., CRON or ISO
	nextExecutionTime: t.integer("next_execution_time").notNull(), // Timestamp ms
	lastExecutionTime: t.integer("last_execution_time"), // Timestamp ms
	isActive: t.integer("is_active", { mode: "boolean" }).notNull(),
	isRecurring: t.integer("is_recurring", { mode: "boolean" }).notNull(),
	createdAt: t
		.integer("created_at")
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	updatedAt: t
		.integer("updated_at")
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
}));

export const document = sqliteTable("document", (t) => ({
	id: t
		.text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(36)),
	roomId: t
		.text("room_id")
		.notNull()
		.references(() => chatRoom.id, { onDelete: "no action" }),
	title: t.text("title").notNull(),
	content: t.text("content").notNull(),
	createdAt: t
		.integer("created_at", { mode: "number" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	createdByMemberId: t.text("created_by_member_id").notNull(),
	createdByMemberType: t
		.text("created_by_member_type")
		.$type<ChatRoomMemberType>()
		.notNull(),
}));

export const mcpServer = sqliteTable("mcp_server", (t) => ({
	id: t
		.text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(36)),
	name: t.text("name").notNull(),
	description: t.text("description"),
	url: t.text("url").notNull(),
	transport: t.text("transport").$type<MCPTransport>().notNull(),
	createdAt: t
		.integer("created_at", { mode: "number" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	updatedAt: t
		.integer("updated_at", { mode: "number" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
}));
