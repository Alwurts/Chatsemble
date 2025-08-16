ALTER TABLE `chat_message` ADD `status` text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `parts` text DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_message` DROP COLUMN `content`;--> statement-breakpoint
ALTER TABLE `chat_message` DROP COLUMN `tool_uses`;