CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`is_onboarding` integer DEFAULT true NOT NULL,
	`onboarding_step` integer DEFAULT 0 NOT NULL,
	`reading_score` real,
	`listening_score` real,
	`speaking_score` real,
	`writing_score` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);