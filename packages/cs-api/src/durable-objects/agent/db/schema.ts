import type { EmojiUsage, LanguageStyle, Tone, Verbosity } from "@/cs-shared";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const agentConfig = sqliteTable("agent_config", {
	id: text("id").primaryKey(), // Same as the DO ID
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
	organizationId: text("organization_id").notNull(),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch() * 1000)`),
});
