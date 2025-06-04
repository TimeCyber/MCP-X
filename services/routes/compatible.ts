import { AIMessage, HumanMessage, SystemMessage, MessageContentComplex } from "@langchain/core/messages";
import { randomUUID } from "crypto";
import express from "express";
import { initChatModel } from "langchain/chat_models/universal";
import { MCPServerManager } from "../mcpServer/index.js";
import { ModelManager } from "../models/index.js";
import { abortControllerMap, handleProcessQuery } from "../processQuery.js";
import { PromptManager } from "../prompt/index.js";
import logger from "../utils/logger.js";

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
      refusal: null;
    };
    delta?: {
      role?: string;
      content?: string;
    };
    logprobs: null;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 多模态内容类型定义
interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image_url";
  image_url: {
    url: string;
    detail?: string;
  };
}

type MultiModalContent = TextContent | ImageContent;

// 验证消息格式的函数
function validateMessage(msg: any): boolean {
  if (!msg.role || typeof msg.role !== "string") {
    return false;
  }
  
  if (!msg.content) {
    return false;
  }
  
  // 支持字符串和数组两种格式
  if (typeof msg.content === "string") {
    return true;
  }
  
  if (Array.isArray(msg.content)) {
    // 验证多模态内容数组
    return msg.content.every((item: any) => {
      if (item.type === "text") {
        return typeof item.text === "string";
      } else if (item.type === "image_url") {
        return item.image_url && typeof item.image_url.url === "string";
      }
      return false;
    });
  }
  
  return false;
}

// 将多模态内容转换为内部格式
function parseMultiModalContent(content: string | MultiModalContent[]): { text: string; images: string[] } {
  if (typeof content === "string") {
    return { text: content, images: [] };
  }
  
  let text = "";
  const images: string[] = [];
  
  for (const item of content) {
    if (item.type === "text") {
      text += item.text;
    } else if (item.type === "image_url") {
      images.push(item.image_url.url);
    }
  }
  
  return { text: text.trim(), images };
}

// 创建多模态消息对象
function createMultiModalMessage(role: string, content: string | MultiModalContent[]) {
  if (typeof content === "string") {
    // 简单文本消息
    if (role === "system") {
      return new SystemMessage(content);
    } else if (role === "assistant") {
      return new AIMessage(content);
    } else {
      return new HumanMessage(content);
    }
  } else {
    // 多模态内容
    const messageContent: MessageContentComplex[] = content.map(item => {
      if (item.type === "text") {
        return { type: "text", text: item.text };
      } else if (item.type === "image_url") {
        return {
          type: "image_url",
          image_url: {
            url: item.image_url.url,
            detail: item.image_url.detail || "auto"
          }
        };
      }
      return { type: "text", text: "" };
    });
    
    if (role === "assistant") {
      return new AIMessage({ content: messageContent });
    } else {
      return new HumanMessage({ content: messageContent });
    }
  }
}

export function compatibleRouter() {
  const router = express.Router();
  const modelManager = ModelManager.getInstance();
  const promptManager = PromptManager.getInstance();
  const mcpServerManager = MCPServerManager.getInstance();

  router.get("/", (req, res) => {
    res.json({
      success: true,
      message: "Welcome to MCP-X Compatible API! 🚀",
    });
  });

  router.get("/models", async (req, res) => {
    try {
      const modelSettings = modelManager.currentModelSettings;
      const models = modelSettings
        ? [
            {
              id: modelSettings.model,
              type: "model",
              owned_by: modelSettings.modelProvider,
            },
          ]
        : [];

      res.json({
        success: true,
        data: models,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  });

  // 兼容聊天完成 API - 现在支持多模态内容
  //@ts-ignore
  router.post("/chat/completions", async (req, res) => {
    try {
      const { messages, stream, tool_choice } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'messages' must be an array",
        });
      }

      if (typeof stream !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Parameter 'stream' must be a boolean",
        });
      }
      if (tool_choice !== "auto" && tool_choice !== "none") {
        return res.status(400).json({
          success: false,
          message: "Parameter 'tool_choice' must be 'auto' or 'none'",
        });
      }

      // 更新的消息验证逻辑 - 支持多模态内容
      const isValidMessage = messages.every(validateMessage);

      if (!isValidMessage) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid message format. Each message must have 'role' and 'content' fields. Content can be a string or an array of text/image_url objects.",
        });
      }

      // 检查模型设置
      const modelSettings = modelManager.currentModelSettings;
      if (!modelSettings) {
        return res.status(500).json({
          success: false,
          message: "No model settings available",
        });
      }

      // 创建历史记录 - 支持多模态内容
      let hasSystemMessage = false;
      let history = messages.slice(0, -1).map((msg) => {
        if (msg.role === "system") {
          hasSystemMessage = true;
        }
        return createMultiModalMessage(msg.role, msg.content);
      });

      // 如果没有系统消息，添加默认系统提示
      if (!hasSystemMessage) {
        const systemPrompt = promptManager.getPrompt("system");
        if (systemPrompt) {
          history = [new SystemMessage(systemPrompt), ...history];
        }
      }

      // 处理最后一条消息（用户输入）
      const lastMessage = messages[messages.length - 1];
      const { text, images } = parseMultiModalContent(lastMessage.content);
      
      // 构建输入对象 - 支持图片
      const input = images.length > 0 ? { text, images } : text;
      
      logger.debug(`[chat/completions] Input processed: text="${text}", images=${images.length}`);

      const availableTools = tool_choice === "auto" ? mcpServerManager.getAvailableTools() : [];

      const modelName = modelSettings.model;
      const baseUrl = modelSettings.configuration?.baseURL || modelSettings.baseURL || "";
      const model = await initChatModel(modelName, {
        ...modelSettings,
        baseUrl,
      });

      const chatId = randomUUID();

      // 设置流式响应
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
      }

      // 设置中止处理器
      const handleAbort = () => {
        const controller = abortControllerMap.get(chatId);
        if (controller) {
          logger.info(`[${chatId}][chat/completions] Chat abort signal sent`);
          controller.abort();
        }
      };

      req.on("close", handleAbort);
      req.on("aborted", handleAbort);
      res.on("close", handleAbort);

      logger.debug(`[${chatId}][chat/completions] Start chat with ${images.length > 0 ? 'multimodal' : 'text'} input`);

      try {
        const { result, tokenUsage } = await handleProcessQuery(
          mcpServerManager.getToolToServerMap(),
          availableTools,
          model,
          input,
          history,
          stream
            ? (text: string) => {
                const streamData = JSON.parse(text);
                if (streamData.type === "text") {
                  const response: ChatCompletionResponse = {
                    id: `chatcmpl-${chatId}`,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model: modelSettings.model,
                    system_fingerprint: "fp_mcpx",
                    choices: [
                      {
                        index: 0,
                        delta: !streamData.content
                          ? { role: "assistant", content: "" }
                          : { content: streamData.content },
                        logprobs: null,
                        finish_reason: null,
                      },
                    ],
                  };
                  res.write(`data: ${JSON.stringify(response)}\n\n`);
                }
              }
            : undefined,
          chatId
        );

        if (stream) {
          // 发送结束响应
          const endResponse: ChatCompletionResponse = {
            id: `chatcmpl-${chatId}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: modelSettings.model,
            system_fingerprint: "fp_mcpx",
            choices: [
              {
                index: 0,
                delta: {},
                logprobs: null,
                finish_reason: "stop",
              },
            ],
          };

          res.write(`data: ${JSON.stringify(endResponse)}\n\n`);
          res.end();
        } else {
          // 发送完整响应
          res.json({
            id: `chatcmpl-${chatId}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: modelSettings.model,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: result,
                  refusal: null,
                },
                logprobs: null,
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: tokenUsage.totalInputTokens,
              completion_tokens: tokenUsage.totalOutputTokens,
              total_tokens: tokenUsage.totalTokens,
            },
            system_fingerprint: "fp_mcpx",
          });
        }
      } finally {
        logger.debug(`[${chatId}][chat/completions] End chat`);
        req.off("close", handleAbort);
        req.off("aborted", handleAbort);
        res.off("close", handleAbort);
      }
    } catch (error: any) {
      logger.error(`[chat/completions] Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
}