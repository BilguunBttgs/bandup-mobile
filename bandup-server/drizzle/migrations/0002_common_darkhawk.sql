CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`skill` text NOT NULL,
	`hp` integer DEFAULT 100 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`skin_id` text,
	`is_alive` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`total_xp` integer DEFAULT 0 NOT NULL,
	`coins` integer DEFAULT 0 NOT NULL,
	`streak_days` integer DEFAULT 0 NOT NULL,
	`last_activity_date` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_stats_user_id_unique` ON `user_stats` (`user_id`);--> statement-breakpoint
CREATE TABLE `quests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_mn` text NOT NULL,
	`description_mn` text NOT NULL,
	`skill_target` text NOT NULL,
	`required_count` integer NOT NULL,
	`xp_reward` integer NOT NULL,
	`coin_reward` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_quests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`quest_id` integer NOT NULL,
	`date` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`quest_id`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shop_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_mn` text NOT NULL,
	`description_mn` text NOT NULL,
	`type` text NOT NULL,
	`effect_key` text,
	`price_coin` integer NOT NULL,
	`icon_key` text NOT NULL,
	`is_available` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`purchased_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer,
	`is_equipped` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `shop_items`(`id`) ON UPDATE no action ON DELETE cascade
);
