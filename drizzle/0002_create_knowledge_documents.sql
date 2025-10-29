-- 创建知识库文档表
CREATE TABLE `knowledge_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`content` text,
	`file_type` text NOT NULL DEFAULT 'txt',
	`file_size` integer,
	`embedding_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
