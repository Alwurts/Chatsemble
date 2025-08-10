CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_by_member_id` text NOT NULL,
	`created_by_member_type` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `chat_room`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chat_message` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`mentions` text NOT NULL,
	`tool_uses` text NOT NULL,
	`member_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`metadata` text NOT NULL,
	`thread_metadata` text,
	`room_id` text NOT NULL,
	`thread_id` integer,
	FOREIGN KEY (`room_id`) REFERENCES `chat_room`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_chat_message`("id", "content", "mentions", "tool_uses", "member_id", "created_at", "metadata", "thread_metadata", "room_id", "thread_id") SELECT "id", "content", "mentions", "tool_uses", "member_id", "created_at", "metadata", "thread_metadata", "room_id", "thread_id" FROM `chat_message`;--> statement-breakpoint
DROP TABLE `chat_message`;--> statement-breakpoint
ALTER TABLE `__new_chat_message` RENAME TO `chat_message`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_chat_room_member` (
	`id` text NOT NULL,
	`room_id` text NOT NULL,
	`type` text NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`room_id`, `id`),
	FOREIGN KEY (`room_id`) REFERENCES `chat_room`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_chat_room_member`("id", "room_id", "type", "role", "name", "email", "image", "created_at") SELECT "id", "room_id", "type", "role", "name", "email", "image", "created_at" FROM `chat_room_member`;--> statement-breakpoint
DROP TABLE `chat_room_member`;--> statement-breakpoint
ALTER TABLE `__new_chat_room_member` RENAME TO `chat_room_member`;--> statement-breakpoint
CREATE TABLE `__new_workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`chat_room_id` text NOT NULL,
	`goal` text NOT NULL,
	`steps` text NOT NULL,
	`schedule_expression` text NOT NULL,
	`next_execution_time` integer NOT NULL,
	`last_execution_time` integer,
	`is_active` integer NOT NULL,
	`is_recurring` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`chat_room_id`) REFERENCES `chat_room`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_workflows`("id", "agent_id", "chat_room_id", "goal", "steps", "schedule_expression", "next_execution_time", "last_execution_time", "is_active", "is_recurring", "created_at", "updated_at") SELECT "id", "agent_id", "chat_room_id", "goal", "steps", "schedule_expression", "next_execution_time", "last_execution_time", "is_active", "is_recurring", "created_at", "updated_at" FROM `workflows`;--> statement-breakpoint
DROP TABLE `workflows`;--> statement-breakpoint
ALTER TABLE `__new_workflows` RENAME TO `workflows`;