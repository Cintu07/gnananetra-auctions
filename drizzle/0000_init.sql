CREATE TABLE `listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`type` text DEFAULT 'land' NOT NULL,
	`state` text,
	`city` text,
	`locality` text,
	`area_sqft` integer,
	`price` integer,
	`emd` integer,
	`auction_at` integer,
	`status` text DEFAULT 'live' NOT NULL,
	`bank` text,
	`image` text,
	`description` text,
	`first_seen_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`last_seen_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`ended_at` integer,
	`clicks` integer DEFAULT 0 NOT NULL,
	`hash` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_source_ext_key` ON `listings` (`source_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `listings_status_idx` ON `listings` (`status`,`auction_at`);--> statement-breakpoint
CREATE INDEX `listings_type_idx` ON `listings` (`type`);--> statement-breakpoint
CREATE INDEX `listings_city_idx` ON `listings` (`city`);--> statement-breakpoint
CREATE INDEX `listings_price_idx` ON `listings` (`price`);--> statement-breakpoint
CREATE INDEX `listings_bank_idx` ON `listings` (`bank`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`homepage` text NOT NULL,
	`kind` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`interval_min` integer DEFAULT 180 NOT NULL,
	`last_run_at` integer,
	`last_ok_at` integer,
	`last_status` text,
	`last_error` text,
	`last_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_slug_unique` ON `sources` (`slug`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`started_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`finished_at` integer,
	`found` integer DEFAULT 0 NOT NULL,
	`added` integer DEFAULT 0 NOT NULL,
	`updated` integer DEFAULT 0 NOT NULL,
	`ended` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`error` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sync_runs_source_idx` ON `sync_runs` (`source_id`,`started_at`);