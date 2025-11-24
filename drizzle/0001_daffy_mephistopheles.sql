CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`company` varchar(255),
	`priority` enum('S級-確認待收款','A級-優質跟進客戶','B級-跟進客戶','C級-養成客戶','D級-低價值無效客戶','E級-永久無需求','聯繫名單失效','客戶要求拒絕往來','黑名單') DEFAULT 'B級-跟進客戶',
	`classification` enum('鯨魚','鯊魚','小魚','小蝦') DEFAULT '小魚',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
