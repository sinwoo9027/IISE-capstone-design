CREATE TABLE `news_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query_key` varchar(255) NOT NULL,
	`summary` text,
	`sentiment_tags` text,
	`region_trend` text,
	`analyzed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_analysis_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_analysis_query_key_unique` UNIQUE(`query_key`)
);
--> statement-breakpoint
CREATE TABLE `news_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query_key` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`link` text NOT NULL,
	`original_link` text,
	`description` text,
	`publish_date` timestamp,
	`source` varchar(100),
	`fetched_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `recommendations` ADD `scale_score` varchar(50);--> statement-breakpoint
ALTER TABLE `recommendations` ADD `rebuild_score` varchar(50);--> statement-breakpoint
ALTER TABLE `recommendations` ADD `price_trend_score` varchar(50);--> statement-breakpoint
ALTER TABLE `recommendations` ADD `jeonse_ratio_score` varchar(50);--> statement-breakpoint
CREATE INDEX `news_analysis_query_key_idx` ON `news_analysis` (`query_key`);--> statement-breakpoint
CREATE INDEX `news_analysis_analyzed_at_idx` ON `news_analysis` (`analyzed_at`);--> statement-breakpoint
CREATE INDEX `news_cache_query_key_idx` ON `news_cache` (`query_key`);--> statement-breakpoint
CREATE INDEX `news_cache_fetched_at_idx` ON `news_cache` (`fetched_at`);