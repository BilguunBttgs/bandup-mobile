PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_quests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`quest_id` integer NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`quest_id`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_quests`("id", "user_id", "quest_id", "period_start", "period_end", "progress", "is_completed", "completed_at") SELECT "id", "user_id", "quest_id", "date", "date", "progress", "is_completed", "completed_at" FROM `user_quests`;--> statement-breakpoint
DROP TABLE `user_quests`;--> statement-breakpoint
ALTER TABLE `__new_user_quests` RENAME TO `user_quests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `quests` ADD `quest_type` text DEFAULT 'daily' NOT NULL;
