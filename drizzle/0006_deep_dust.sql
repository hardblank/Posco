CREATE TABLE `finance_months` (
	`month_key` text PRIMARY KEY NOT NULL,
	`income` real NOT NULL,
	`income_robson` real,
	`income_gabi` real,
	`freelance_json` text DEFAULT '[]' NOT NULL,
	`food_robson` real NOT NULL,
	`food_gabi` real NOT NULL,
	`expenses_json` text NOT NULL,
	`updated_at` text NOT NULL
);
