CREATE TABLE `data_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_type` varchar(100) NOT NULL,
	`source_url` text,
	`collected_at` timestamp DEFAULT (now()),
	`raw_payload` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `data_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news_info` (
	`id` int AUTO_INCREMENT NOT NULL,
	`news_id` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`link` text NOT NULL,
	`original_link` text,
	`publish_date` timestamp,
	`source` varchar(100),
	`region_code` varchar(50),
	`apt_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_info_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_info_news_id_unique` UNIQUE(`news_id`)
);
--> statement-breakpoint
CREATE TABLE `news_raw` (
	`id` int AUTO_INCREMENT NOT NULL,
	`news_id` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`crawled_at` timestamp DEFAULT (now()),
	`content_text` text,
	`checksum` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_raw_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_raw_url_unique` UNIQUE(`url`)
);
--> statement-breakpoint
CREATE TABLE `rebuild_status_current` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apt_id` int NOT NULL,
	`is_rebuild_candidate` int DEFAULT 0,
	`stage` varchar(50),
	`stage_updated_at` timestamp,
	`approval_date` timestamp,
	`management_disposal_date` timestamp,
	`expected_households` int,
	`updated_date` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rebuild_status_current_id` PRIMARY KEY(`id`),
	CONSTRAINT `rebuild_status_current_apt_id_unique` UNIQUE(`apt_id`)
);
--> statement-breakpoint
CREATE TABLE `rebuild_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apt_id` int NOT NULL,
	`stage` varchar(50) NOT NULL,
	`effective_from` timestamp NOT NULL,
	`effective_to` timestamp,
	`evidence_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rebuild_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `evidence_source_type_idx` ON `data_evidence` (`source_type`);--> statement-breakpoint
CREATE INDEX `news_apt_id_idx` ON `news_info` (`apt_id`);--> statement-breakpoint
CREATE INDEX `news_region_code_idx` ON `news_info` (`region_code`);--> statement-breakpoint
CREATE INDEX `news_publish_date_idx` ON `news_info` (`publish_date`);--> statement-breakpoint
CREATE INDEX `news_raw_news_id_idx` ON `news_raw` (`news_id`);--> statement-breakpoint
CREATE INDEX `news_raw_checksum_idx` ON `news_raw` (`checksum`);--> statement-breakpoint
CREATE INDEX `rebuild_current_apt_id_idx` ON `rebuild_status_current` (`apt_id`);--> statement-breakpoint
CREATE INDEX `rebuild_current_stage_idx` ON `rebuild_status_current` (`stage`);--> statement-breakpoint
CREATE INDEX `rebuild_history_apt_id_idx` ON `rebuild_status_history` (`apt_id`);--> statement-breakpoint
CREATE INDEX `rebuild_history_stage_idx` ON `rebuild_status_history` (`stage`);