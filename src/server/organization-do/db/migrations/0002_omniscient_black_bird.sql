ALTER TABLE `chat_message` ADD `status` text NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `parts` text DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_message` DROP COLUMN `content`;--> statement-breakpoint
ALTER TABLE `chat_message` DROP COLUMN `tool_uses`;