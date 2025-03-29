CREATE TABLE `agent_config` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`image` text NOT NULL,
	`description` text NOT NULL,
	`tone` text NOT NULL,
	`verbosity` text NOT NULL,
	`emoji_usage` text NOT NULL,
	`language_style` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_config_email_unique` ON `agent_config` (`email`);