CREATE TABLE `finance_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`income` real NOT NULL,
	`food_robson` real NOT NULL,
	`food_gabi` real NOT NULL,
	`expenses_json` text NOT NULL,
	`updated_at` text NOT NULL
);
