import { iQueryInput } from "../utils/types.js";
import axios, { AxiosInstance } from "axios";
import Database from "better-sqlite3";
import { and, eq, gt } from "drizzle-orm";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import * as schema from "./schema.js";
import { chats, messages, type NewMessage } from "./schema.js";

// 定義通用的請求選項介面
interface DatabaseOptions {
  user_access_token?: string;
  fingerprint?: string;
  LLM_Model?: {
    model: string;
    total_input_tokens: number;
    total_output_tokens: number;
    total_run_time: number;
  };
}

// define database operations
interface DatabaseOperations {
  MODE: DatabaseMode;
  db: BetterSQLite3Database<typeof schema>;
  getAllChats(options?: DatabaseOptions): Promise<(typeof schema.chats.$inferSelect)[]>;
  getChatWithMessages(
    chatId: string,
    options?: DatabaseOptions
  ): Promise<{ chat: typeof schema.chats.$inferSelect; messages: (typeof schema.messages.$inferSelect)[] } | null>;
  createChat(chatId: string, title: string, options?: DatabaseOptions): Promise<typeof schema.chats.$inferSelect>;
  createMessage(data: NewMessage, options?: DatabaseOptions): Promise<typeof schema.messages.$inferSelect>;
  checkChatExists(chatId: string, options?: DatabaseOptions): Promise<boolean>;
  deleteChat(chatId: string, options?: DatabaseOptions): Promise<void>;
  deleteMessagesAfter(chatId: string, messageId: string, options?: DatabaseOptions): Promise<void>;
  updateMessageContent(messageId: string, data: iQueryInput, options?: DatabaseOptions): Promise<typeof schema.messages.$inferSelect>;
  getNextAIMessage(chatId: string, messageId: string): Promise<typeof schema.messages.$inferSelect>;
}

// direct database access implementation
class DirectDatabaseAccess implements DatabaseOperations {
  public db: BetterSQLite3Database<typeof schema>;
  public MODE: DatabaseMode = DatabaseMode.DIRECT;
  constructor(dbPath?: string) {
    try {
      const sqlite = new Database(dbPath || "data/database.sqlite");
      this.db = drizzle(sqlite, { schema: schema });

      // Create index after drizzle initialization
      // sqlite.exec(`
      //   CREATE INDEX IF NOT EXISTS message_chat_id_idx
      //     ON messages(chat_id)
      //   `);
      logger.info("Database initialized");
    } catch (error) {
      logger.error("Error initializing database:", error);
      throw error;
    }
  }

  async getAllChats(_options?: DatabaseOptions) {
    const chats = await this.db.query.chats.findMany();
    return chats.reverse();
  }

  async getChatWithMessages(chatId: string, _options?: DatabaseOptions) {
    const chat = await this.db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) return null;

    const history = await this.db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
    });

    return { chat, messages: history };
  }

  async createChat(chatId: string, title: string, _options?: DatabaseOptions) {
    const [chat] = await this.db
      .insert(chats)
      .values({ id: chatId, title, createdAt: new Date().toISOString() })
      .returning();
    return chat;
  }

  async createMessage(data: NewMessage, _options?: DatabaseOptions) {
    return await this.db.transaction(async (tx) => {
      const chatExists = await tx.query.chats.findFirst({
        where: eq(chats.id, data.chatId),
      });

      if (!chatExists) {
        throw new Error(`Chat ${data.chatId} does not exist`);
      }

      const [message] = await tx.insert(messages).values(data).returning();
      return message;
    });
  }

  async checkChatExists(chatId: string, _options?: DatabaseOptions) {
    const chat = await this.db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });
    return !!chat;
  }

  async deleteChat(chatId: string, _options?: DatabaseOptions) {
    await this.db.delete(chats).where(eq(chats.id, chatId));
    await this.db.delete(messages).where(eq(messages.chatId, chatId));
  }

  async deleteMessagesAfter(chatId: string, messageId: string, _options?: DatabaseOptions) {
    const targetMessage = await this.db.query.messages.findFirst({
      where: eq(messages.messageId, messageId),
    });

    if (!targetMessage) {
      throw new Error(`Message ${messageId} does not exist`);
    }

    await this.db.delete(messages).where(and(eq(messages.chatId, chatId), gt(messages.id, targetMessage.id - 1)));
  }

  // Update message content
  updateMessageContent = async (messageId: string, data: iQueryInput) => {
    const message = await this.db.query.messages.findFirst({
      where: eq(messages.messageId, messageId),
    });

    if (!message) {
      throw new Error(`Update Message ${messageId} does not exist`);
    }

    if (message.role !== "user") {
      throw new Error("Only user messages can be edited");
    }

    // Prepare data for update
    const updateData: Partial<NewMessage> = {};

    if (data.text !== undefined) {
      updateData.content = data.text;
    }

    const files: string[] = [];
    if (data.images) {
      files.push(...data.images);
    }
    if (data.documents) {
      files.push(...data.documents);
    }
    updateData.files = files;

    const [updatedMessage] = await this.db
      .update(messages)
      .set(updateData)
      .where(eq(messages.messageId, messageId))
      .returning();

    return updatedMessage;
  };

  // Get the next AI message after a user message
  getNextAIMessage = async (chatId: string, messageId: string) => {
    const userMessage = await this.db.query.messages.findFirst({
      where: eq(messages.messageId, messageId),
    });

    if (!userMessage) {
      throw new Error(`The Message ${messageId} for get Next AI Message does not exist`);
    }

    if (userMessage.role !== "user") {
      throw new Error("Can only get next AI message for user messages");
    }

    const nextMessage = await this.db.query.messages.findFirst({
      where: and(eq(messages.chatId, chatId), gt(messages.id, userMessage.id), eq(messages.role, "assistant")),
    });

    if (!nextMessage) {
      throw new Error(`No AI message found after user message ${messageId}. This indicates a data integrity issue.`);
    }

    return nextMessage;
  };
}

// API access implementation
class ApiDatabaseAccess implements DatabaseOperations {
  public db: any
  private baseUrl: string;
  private verifyToken: string | null;
  private axiosInstance!: AxiosInstance;
  public MODE: DatabaseMode = DatabaseMode.API;

  constructor(baseUrl: string) {
    this.db = null;
    this.baseUrl = baseUrl;
    this.verifyToken = null;
    void this.initAxios();
  }

  private async initAxios() {
    const https = await import("https");
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });
  }

  private async getHeaders(options?: DatabaseOptions) {
    const token = await this.getVerifyToken();
    return {
      Authorization: options?.user_access_token ? `Bearer ${options.user_access_token}` : undefined,
      "X-MCP-TOKEN": token,
    };
  }

  private getUseridFromJWT(token: string) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "");
    return decoded.sub;
  }

  async getVerifyToken() {
    if (this.verifyToken) return this.verifyToken;
    try {
      const response = await this.axiosInstance.post("/token", {
        fingerprint: "funmula",
      });
      if (response.data.result && response.data.token) {
        this.verifyToken = response.data.token;
      }
      if (!this.verifyToken) {
        throw new Error("Verify token is null");
      }
      return this.verifyToken;
    } catch (error) {
      logger.error("Error getting verify token:", error);
      throw error;
    }
  }

  async getAllChats(options?: DatabaseOptions) {
    const { fingerprint = "funmula" } = options || {};
    const response = await this.axiosInstance.get("/session/user", {
      headers: await this.getHeaders(options),
      data: {
        fingerprint,
      },
    });
    const resBody = response.data;

    if (!resBody.result) {
      throw new Error("Failed to get chats - " + resBody.message);
    }

    const chats = resBody.data.map((chat: any) => ({
      id: chat.mcp_session_id,
      title: chat.title,
      createdAt: chat.createtime,
    })) as (typeof schema.chats.$inferSelect)[];
    return chats;
  }

  async getChatWithMessages(chatId: string, options?: DatabaseOptions) {
    const { fingerprint = "funmula" } = options || {};
    const chatResponse = await this.axiosInstance.get(`/session/${chatId}`, {
      headers: await this.getHeaders(options),
      data: {
        fingerprint,
      },
    });

    const chatResBody = chatResponse.data;
    if (!chatResBody.result) {
      logger.debug(`[${chatId}] [Get chat with messages] Chat Response - ${JSON.stringify(chatResBody)}`);
      return null;
    }

    const messageResponse = await this.axiosInstance.get(`/message/${chatId}`, {
      headers: await this.getHeaders(options),
      data: {
        fingerprint,
      },
    });

    const messageResBody = messageResponse.data;
    if (!messageResBody.result) {
      logger.debug(`[${chatId}] [Get chat with messages] Message Response - ${JSON.stringify(messageResBody)}`);
      return null;
    }

    const chat = {
      id: chatResBody.data.mcp_session_id,
      title: chatResBody.data.title,
      createdAt: chatResBody.data.createtime,
    } as typeof schema.chats.$inferSelect;

    const messages = messageResBody.data.map((message: any) => ({
      id: message.mcp_message_id,
      messageId: message.mcp_message_id,
      content: message.content,
      createdAt: message.createtime,
      role: message.role,
      chatId: message.mcp_session_id,
    })) as (typeof schema.messages.$inferSelect)[];

    return { chat, messages };
  }

  async createChat(chatId: string, title: string, options?: DatabaseOptions) {
    const { fingerprint = "funmula" } = options || {};
    const response = await this.axiosInstance.post(
      "/session",
      {
        id: chatId,
        mcp_session_id: chatId,
        title,
        fingerprint,
      },
      {
        headers: await this.getHeaders(options),
      }
    );

    const resBody = response.data;
    if (!resBody.result) {
      throw new Error("Failed to create chat - " + resBody.message);
    }
    return resBody.data;
  }

  async createMessage(data: NewMessage, options?: DatabaseOptions) {
    const { fingerprint = "funmula" } = options || {};
    const response = await this.axiosInstance.post(
      "/message",
      {
        ...data,
        mcp_session_id: data.chatId,
        mcp_message_id: data.messageId,
        createtime: data.createdAt,
        fingerprint,
        LLM_Model: data.role === "assistant" ? options?.LLM_Model : undefined,
      },
      {
        headers: await this.getHeaders(options),
      }
    );

    const resBody = response.data;
    if (!resBody.result) {
      throw new Error("Failed to create message - " + resBody.message);
    }
    return resBody.data;
  }

  async checkChatExists(chatId: string, options?: DatabaseOptions) {
    const { fingerprint = "funmula" } = options || {};
    const response = await this.axiosInstance.get(`/session/${chatId}`, {
      headers: await this.getHeaders(options),
      data: {
        fingerprint,
      },
    });
    const resBody = response.data;
    return resBody.result;
  }

  async deleteChat(chatId: string, options?: DatabaseOptions) {
    const { fingerprint = "funmula" } = options || {};
    await this.axiosInstance.delete(`/message/${chatId}`, {
      headers: await this.getHeaders(options),
      data: {
        fingerprint,
      },
    });
  }

  async deleteMessagesAfter(chatId: string, messageId: string, options?: DatabaseOptions) {
    const { fingerprint = "funmula" } = options || {};
    await this.axiosInstance.delete(`/message/${chatId}/${messageId}/after`, {
      headers: await this.getHeaders(options),
      data: {
        fingerprint,
      },
    });
  }

  async deleteSingleMessage(chatId: string, messageId: string, options?: DatabaseOptions) {
    const { fingerprint = "funmula" } = options || {};
    await this.axiosInstance.delete(`/message/${chatId}/${messageId}`, {
      headers: await this.getHeaders(options),
      data: {
        fingerprint,
      },
    });
  }

  async updateMessageContent(messageId: string, data: iQueryInput, options?: DatabaseOptions) {
    const { fingerprint = "funmula" } = options || {};
    const response = await this.axiosInstance.put(`/message/${messageId}`, {
      headers: await this.getHeaders(options),
      data: {
        fingerprint,
      },
    });
    return response.data as typeof schema.messages.$inferSelect;
  }

  async getNextAIMessage(chatId: string, messageId: string) {
    const response = await this.axiosInstance.get(`/message/${chatId}/${messageId}/next`, {
      headers: await this.getHeaders(),
    });
    return response.data;
  }
}
// Database access mode
export enum DatabaseMode {
  DIRECT = "direct",
  API = "api",
}

// Database operations instance
let databaseOperations: DatabaseOperations;

// Initialize database
export const initDatabase = (mode: DatabaseMode, config: { dbPath?: string; apiUrl?: string }) => {
  switch (mode) {
    case DatabaseMode.DIRECT:
      if (!config.dbPath) throw new Error("Database path is required for Direct mode");
      databaseOperations = new DirectDatabaseAccess(config.dbPath);
      break;
    case DatabaseMode.API:
      if (!config.apiUrl) throw new Error("API URL is required for API mode");
      databaseOperations = new ApiDatabaseAccess(config.apiUrl);
      break;
    default:
      throw new Error("Invalid database mode");
  }
};

// Export all database operations
export const getAllChats = (options?: DatabaseOptions) => databaseOperations.getAllChats(options);
export const getChatWithMessages = (chatId: string, options?: DatabaseOptions) =>
  databaseOperations.getChatWithMessages(chatId, options);
export const createChat = (chatId: string, title: string, options?: DatabaseOptions) =>
  databaseOperations.createChat(chatId, title, options);
export const createMessage = (data: NewMessage, options?: DatabaseOptions) =>
  databaseOperations.createMessage(data, options);
export const checkChatExists = (chatId: string, options?: DatabaseOptions) =>
  databaseOperations.checkChatExists(chatId, options);
export const deleteChat = (chatId: string, options?: DatabaseOptions) => databaseOperations.deleteChat(chatId, options);
export const deleteMessagesAfter = (chatId: string, messageId: string, options?: DatabaseOptions) =>
  databaseOperations.deleteMessagesAfter(chatId, messageId, options);
export const updateMessageContent = (messageId: string, data: iQueryInput, options?: DatabaseOptions) =>
  databaseOperations.updateMessageContent(messageId, data, options);
export const getNextAIMessage = (chatId: string, messageId: string) =>
  databaseOperations.getNextAIMessage(chatId, messageId);
export const getDatabaseMode = () => databaseOperations.MODE;
export const getDB = () => databaseOperations.db;
