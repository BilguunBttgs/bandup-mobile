CREATE TABLE `listenings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`audio_key` text NOT NULL,
	`transcript` text,
	`level` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `listening_question_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer NOT NULL,
	`label` text NOT NULL,
	`text` text NOT NULL,
	`is_correct` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `listening_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `listening_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listening_id` integer NOT NULL,
	`order` integer NOT NULL,
	`text` text NOT NULL,
	`type` text NOT NULL,
	`explanation` text,
	FOREIGN KEY (`listening_id`) REFERENCES `listenings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_listening_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`listening_id` integer NOT NULL,
	`answers` text NOT NULL,
	`correct_count` integer NOT NULL,
	`total_questions` integer NOT NULL,
	`band_score` real NOT NULL,
	`time_taken_seconds` integer NOT NULL,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listening_id`) REFERENCES `listenings`(`id`) ON UPDATE no action ON DELETE cascade
);
