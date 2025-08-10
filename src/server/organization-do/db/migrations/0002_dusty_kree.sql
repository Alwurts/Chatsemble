ALTER TABLE `chat_message` ADD `parts` text NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_message` DROP COLUMN `content`;--> statement-breakpoint
ALTER TABLE `chat_message` DROP COLUMN `tool_uses`;