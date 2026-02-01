CREATE TABLE `apartments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apt_name` varchar(255) NOT NULL,
	`sigungu` varchar(100) NOT NULL,
	`dong` varchar(100) NOT NULL,
	`lat` varchar(50) NOT NULL,
	`lng` varchar(50) NOT NULL,
	`built_year` int,
	`households` int,
	`repr_area_m2` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apartments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`apt_id` int NOT NULL,
	`score` varchar(50) NOT NULL,
	`transport_score` varchar(50) NOT NULL,
	`investment_score` varchar(50) NOT NULL,
	`trend_score` varchar(50) NOT NULL,
	`explanation` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subway_stations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`station_name` varchar(255) NOT NULL,
	`line` varchar(100) NOT NULL,
	`lat` varchar(50) NOT NULL,
	`lng` varchar(50) NOT NULL,
	`is_transfer` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subway_stations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apt_id` int NOT NULL,
	`contract_date` varchar(50) NOT NULL,
	`price_krw` varchar(50) NOT NULL,
	`area_m2` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`budget` varchar(50) NOT NULL,
	`min_area` varchar(50) NOT NULL,
	`investment_type` varchar(50) NOT NULL,
	`transport_importance` int NOT NULL,
	`preferred_sigungu` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `apt_id_idx` ON `transactions` (`apt_id`);--> statement-breakpoint
CREATE INDEX `contract_date_idx` ON `transactions` (`contract_date`);