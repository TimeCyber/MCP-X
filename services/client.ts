import { BaseMessage, SystemMessage } from "@langchain/core/messages";
import { randomUUID } from "crypto";
import * as readline from "node:readline";
import axios from "axios";
import {
  checkChatExists,
  createChat,
  createMessage,
  deleteMessagesAfter,
  getChatWithMessages,
} from "./database/index.js";
import { MCPServerManager } from "./mcpServer/index.js";
import { ModelManager } from "./models/index.js";
import { handleProcessQuery } from "./processQuery.js";
import { PromptManager } from "./prompt/index.js";
import logger from "./utils/logger.js";
import { processHistoryMessages } from "./utils/processHistory.js";
import { iQueryInput, iStreamMessage } from "./utils/types.js";

interface MCPClientConfig {
  modelConfigPath?: string;
  mcpServerConfigPath?: string;
  customRulesPath?: string;
}

export class MCPClient {
  private config: MCPClientConfig;

  constructor(config: MCPClientConfig = {}) {
    this.config = config;
  }

  // 同步智能体状态的方法
  private async syncAgentState() {
    try {
      // 尝试从多个可能的端口获取智能体状态
      const possiblePorts = [process.env.PORT || 4321, 4321, 3000];
      let response = null;
      
      for (const port of possiblePorts) {
        try {
          const url = `http://localhost:${port}/api/agent/current/active`;
          response = await axios.get(url, { timeout: 1000 });
          break; // 成功则跳出循环
        } catch (err) {
          // 尝试下一个端口
          continue;
        }
      }
      
      if (response && response.status === 200 && response.data) {
        const data = response.data;
        if (data.success && data.activeAgent) {
          // 设置到PromptManager
          PromptManager.getInstance().setAgent({
            name: data.activeAgent.name,
            systemRole: data.activeAgent.systemRole,
            systemPromote: data.activeAgent.systemPromote,
            openSay: data.activeAgent.openSay
          });
          logger.debug(`[Agent] Synced active agent: ${data.activeAgent.name}`);
        } else {
          // 没有激活的智能体，清除当前设置
          PromptManager.getInstance().clearAgent();
          logger.debug(`[Agent] No active agent, cleared agent state`);
        }
        // 标记同步完成
        PromptManager.getInstance().markAgentSynced();
      } else {
        logger.debug(`[Agent] Agent API not available or no active agent`);
        PromptManager.getInstance().clearAgent();
        PromptManager.getInstance().markAgentSynced();
      }
    } catch (error: any) {
      logger.debug(`[Agent] Agent sync not available: ${error.message}`);
      // 发生错误时不影响正常对话流程，保持现有智能体状态
    }
  }

  public async init() {
    // Initialize Model Manager
    await ModelManager.getInstance(this.config?.modelConfigPath).initializeModel();
    // Initialize Prompt Manager
    PromptManager.getInstance(this.config?.customRulesPath);
    // Initialize MCP Server Manager
    await MCPServerManager.getInstance(this.config?.mcpServerConfigPath).initialize();
    console.log("\n"); // New line
  }

  public async processQuery(
    chatId: string | undefined,
    input: string | iQueryInput,
    onStream?: (text: string) => void,
    regenerateMessageId?: string,
    fingerprint?: string,
    user_access_token?: string,
    agentName?: string
  ) {
    let startTime = new Date();
    let chat_id = chatId || randomUUID();
    logger.debug(`[${chat_id}] Processing query`);
    let history: BaseMessage[] = [];
    let title = "New Chat";
    let titlePromise: Promise<string> | undefined;

    // 在每次对话开始时同步智能体状态（带缓存）
    if (PromptManager.getInstance().needsAgentSync()) {
      await this.syncAgentState();
    }

    const systemPrompt = PromptManager.getInstance().getPrompt("system");
    if (systemPrompt) {
      history.push(new SystemMessage(systemPrompt));
    }

    // we use the user input text to generate title
    // TODO: will fix the issue when only file
    const userInput = typeof input === "string" ? input : input.text;

    const messageHistory = await getChatWithMessages(chat_id);
    if (messageHistory && messageHistory.messages.length > 0) {
      title = messageHistory.chat.title;
      // if retry then slice the history messages before the regenerateMessageId
      if (regenerateMessageId) {
        const targetIndex = messageHistory.messages.findIndex((msg) => msg.messageId === regenerateMessageId);
        if (targetIndex >= 0) {
          messageHistory.messages = messageHistory.messages.slice(0, targetIndex);
        }
      }
      history = await processHistoryMessages(messageHistory.messages, history);
    }
    // no history messages means it's a new chat
    else {
      // Generate title for new chat asynchronously
      if (userInput) {
        titlePromise = ModelManager.getInstance().generateTitle(userInput);
      }
    }

    logger.debug(`[${chat_id}] Query pre-processing time: ${new Date().getTime() - startTime.getTime()}ms`);

    if (onStream) {
      onStream(
        JSON.stringify({
          type: "chat_info",
          content: {
            id: chat_id,
            title: title || "New Chat",
          },
        } as iStreamMessage)
      );
    }

    try {
      const serverManager = MCPServerManager.getInstance();
      const toolClientMap = serverManager.getToolToServerMap();
      const availableTools = serverManager.getAvailableTools();

      const { result, tokenUsage } = await handleProcessQuery(
        toolClientMap,
        availableTools,
        ModelManager.getInstance().getModel(),
        input,
        history,
        onStream,
        chat_id
      );

      const totalRunTime = Number(((new Date().getTime() - startTime.getTime()) / 1000).toFixed(2));
      logger.debug(`[${chat_id}] Total run time: ${totalRunTime}s`);

      if (!onStream) {
        console.log("\nAssistant:\n", result);
      }

      // Pending title generation, wait for it here with timeout
      if (titlePromise) {
        // Timeout is to prevent the title generation delay long time when the query process is aborted
        try {
          title = await Promise.race([
            titlePromise,
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Title generation timeout")), 5000)),
          ]);
        } catch (error: any) {
          logger.warn(`[${chat_id}] Title generation failed or timed out: ${error.message}`);
          title = "New Chat";
        }
      }

      // double check the chat exists and create to database if necessary
      const isChatExists = await checkChatExists(chat_id);
      if (!isChatExists) {
        await createChat(chat_id, title || "New Chat", agentName, {
          fingerprint: fingerprint,
          user_access_token: user_access_token,
        });
      }

      // if retry then delete the messages after the regenerateMessageId firstly
      if (regenerateMessageId) {
        await deleteMessagesAfter(chat_id, regenerateMessageId);
      }
      const userMessageId = randomUUID();
      if (!regenerateMessageId) {
        const files = (typeof input === "object" && [...(input.images || []), ...(input.documents || [])]) || [];
        await createMessage(
          {
            role: "user",
            chatId: chat_id,
            messageId: userMessageId,
            content: userInput || "",
            files: files,
            createdAt: new Date().toISOString(),
          },
          {
            fingerprint: fingerprint,
            user_access_token: user_access_token,
          }
        );
      }
      const assistantMessageId = randomUUID();
      await createMessage(
        {
          role: "assistant",
          chatId: chat_id,
          messageId: assistantMessageId,
          content: result,
          files: [],
          createdAt: new Date().toISOString(),
        },
        {
          LLM_Model: {
            model: ModelManager.getInstance().currentModelSettings?.model || "",
            total_input_tokens: tokenUsage.totalInputTokens,
            total_output_tokens: tokenUsage.totalOutputTokens,
            total_run_time: totalRunTime,
          },
          fingerprint: fingerprint,
          user_access_token: user_access_token,
        }
      );

      if (onStream) {
        onStream(
          JSON.stringify({
            type: "message_info",
            content: {
              // if retry then set the userMessageId is not required
              userMessageId: regenerateMessageId ? "" : userMessageId,
              assistantMessageId: assistantMessageId,
            },
          } as iStreamMessage)
        );
      }

      if (onStream) {
        onStream(
          JSON.stringify({
            type: "chat_info",
            content: {
              id: chat_id,
              title: title || "New Chat",
            },
          } as iStreamMessage)
        );
      }

      logger.debug(`[${chat_id}] Query processed successfully`);
      return result;
    } catch (error: any) {
      logger.error(`[${chat_id}] Error processing query: ${error.message}`);
      if (onStream) {
        onStream(
          JSON.stringify({
            type: "error",
            content: (error as Error).message,
          } as iStreamMessage)
        );
      }
      throw error;
    }
  }

  public async cleanup() {
    await MCPServerManager.getInstance().disconnectAllServers();
  }
}

export class MCPCliClient extends MCPClient {
  constructor(config: MCPClientConfig = {}) {
    super(config);
  }

  async chatLoop() {
    const chatId = randomUUID();
    console.log(`\nChat ID: ${chatId}\n`);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    while (true) {
      const input = await new Promise<string>((resolve) => {
        console.log("=========================================");
        rl.question("\nEnter your message (or 'exit' to quit): ", resolve);
      });

      if (!input || input.trim() === "") {
        console.log("Please enter a valid message.");
        continue;
      }

      if (input.toLowerCase() === "exit") {
        console.log("\nSee you next time!");
        break;
      }

      try {
        // Command line streaming output handler
        console.log("\nAssistant:");
        const onStream = (text: string) => {
          try {
            const streamRes = JSON.parse(text);
            process.stdout.write(streamRes.content);
          } catch {
            process.stdout.write(text);
          }
        };

        await this.processQuery(chatId, input, onStream, undefined, undefined, undefined, undefined);
        console.log("\n");
      } catch (error: any) {
        console.error("\nError processing query:", error.message);
      }
    }

    rl.close();
    await MCPServerManager.getInstance().disconnectAllServers();
  }
}
