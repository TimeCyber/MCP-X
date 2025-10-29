import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  agentName: text("agent_name"), // 添加agent名称字段
  createdAt: text("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  role: text("role").notNull(),
  chatId: text("chat_id").notNull(),
  messageId: text("message_id").notNull(),
  createdAt: text("created_at").notNull(),
  files: text("files", { mode: "json" }).notNull(),
});

export const knowledge_documents = sqliteTable("knowledge_documents", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  content: text("content"),
  fileType: text("file_type").notNull(), // 文件类型 (txt, md, pdf, etc.)
  fileSize: integer("file_size"), // 文件大小 (bytes)
  embeddingId: text("embedding_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// export types
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type KnowledgeDocument = typeof knowledge_documents.$inferSelect;
export type NewKnowledgeDocument = typeof knowledge_documents.$inferInsert;
