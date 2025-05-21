import { BaseChatModel, BindToolsInput } from "@langchain/core/language_models/chat_models";
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  MessageContentComplex,
  ToolMessage,
} from "@langchain/core/messages";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ModelManager } from "./models/index.js";
import { imageToBase64 } from "./utils/image.js";
import logger from "./utils/logger.js";
import { iQueryInput, iStreamMessage, ModelSettings } from "./utils/types.js";
import { openAIConvertToGeminiTools } from "./utils/toolHandler.js";
import { ToolDefinition } from "@langchain/core/language_models/base";

// Map to store abort controllers
export const abortControllerMap = new Map<string, AbortController>();

// Map to store partial responses when aborted
export interface AbortedResponse {
  content: string;
}

export const abortedResponseMap = new Map<string, AbortedResponse>();

interface TokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
}

export async function handleProcessQuery(
  toolToClientMap: Map<string, Client>,
  availableTools: ToolDefinition[],
  model: BaseChatModel | null,
  input: string | iQueryInput,
  history: BaseMessage[],
  onStream?: (text: string) => void,
  chatId?: string
) {
  // If chatId exists, create a new AbortController
  if (chatId) {
    const existingController = abortControllerMap.get(chatId);
    if (existingController) {
      existingController.abort();
      abortControllerMap.delete(chatId);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      logger.debug(`[${chatId}] Abort previous chat and delete abortController`);
    }

    const controller = new AbortController();
    abortControllerMap.set(chatId, controller);
    logger.debug(`[${chatId}] Set new abortController`);
  }

  let finalResponse = "";

  const modelManager = ModelManager.getInstance();
  const currentModelSettings = modelManager.currentModelSettings;

  const tokenUsage = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
  };

  try {
    // Handle input format
    let messages: BaseMessage[] = history;

    if (!model) {
      throw new Error("Model not initialized");
    }

    // if retry, then input is empty
    if (input) {
      if (typeof input === "string") {
        messages.push(new HumanMessage(input));
      } else {
        // Handle input with images
        const content: MessageContentComplex[] = [];

        // Add text content if exists
        if (input.text) {
          content.push({ type: "text", text: input.text });
        }

        // Add image content if exists
        if (input.images && input.images.length > 0) {
          for (const imagePath of input.images) {
            // Get actual file path from URL
            const localPath = `${imagePath}`;
            const base64Image = await imageToBase64(localPath);
            content.push({
              type: "text",
              text: `![Image](${localPath})`,
            });
            content.push({
              type: "image_url",
              image_url: {
                url: base64Image,
              },
            });
          }
        }

        // Add image content if exists
        if (input.documents && input.documents.length > 0) {
          for (const documentPath of input.documents) {
            const localPath = `${documentPath}`;
            content.push({
              type: "text",
              text: `![Document](${localPath})`,
            });
          }
        }

        messages.push(new HumanMessage({ content }));
      }
    }

    let hasToolCalls = true;

    const tools = currentModelSettings?.modelProvider === "google-genai" ? openAIConvertToGeminiTools(availableTools) : availableTools;

    const runModel = modelManager.enableTools ? model.bindTools?.(tools) || model : model;

    const isOllama = currentModelSettings?.modelProvider === "ollama";
    const isDeepseek =
      currentModelSettings?.configuration?.baseURL?.toLowerCase().includes("deepseek") ||
      currentModelSettings?.model?.toLowerCase().includes("deepseek");
    const isMistralai = currentModelSettings?.modelProvider === "mistralai";
    const isBedrock = currentModelSettings?.modelProvider === "bedrock";

    logger.debug(`[${chatId}] Start to process LLM query`);

    while (hasToolCalls) {
      const stream = await runModel.stream(messages, {
        signal: chatId ? abortControllerMap.get(chatId)?.signal : undefined,
      });

      let currentContent = "";
      let toolCalls: any[] = [];

      try {
        // Track token usage if available
        for await (const chunk of stream) {
          caculateTokenUsage(tokenUsage, chunk, currentModelSettings!);

          if (chunk.content) {
            let chunkMessage = "";
            if (Array.isArray(chunk.content)) {
              // compatible Anthropic response format
              const textContent = chunk.content.find((item) => item.type === "text" || item.type === "text_delta");
              // @ts-ignore
              chunkMessage = textContent?.text || "";
            } else {
              chunkMessage = chunk.content;
            }
            currentContent += chunkMessage;
            onStream?.(
              JSON.stringify({
                type: "text",
                content: chunkMessage,
              } as iStreamMessage)
            );
          }

          // Handle tool call stream
          /** Note: When using stream, read tool_call_chunks to get tool call results
           *  tool_calls arguments are empty.
           */
          if (
            chunk.tool_calls ||
            chunk.tool_call_chunks ||
            (Array.isArray(chunk.content) && chunk.content.some((item) => item.type === "tool_use"))
          ) {
            let toolCallChunks: any[] = [];

            toolCallChunks = chunk.tool_call_chunks || [];

            for (const chunks of toolCallChunks) {
              let index = chunks.index;
              // Use index to find or create tool call record
              // Ollama have multiple tool_call with same index and diff id
              if (isOllama && index !== undefined && index >= 0 && toolCalls[index]) {
                index = toolCalls.findIndex((toolCall) => toolCall.id === chunks.id);
                if (index === undefined || index < 0) {
                  index = toolCalls.length;
                }
              }

              if (index !== undefined && index >= 0 && !toolCalls[index]) {
                toolCalls[index] = {
                  id: chunks.id,
                  type: "function",
                  function: {
                    name: chunks.name,
                    arguments: "",
                  },
                };
              }

              if (index !== undefined && index >= 0) {
                if (chunks.name) {
                  toolCalls[index].function.name = chunks.name;
                }

                if (chunks.args || chunks.input) {
                  const newArgs = chunks.args || chunks.input || "";
                  toolCalls[index].function.arguments += newArgs;
                }

                // Try to parse complete arguments
                try {
                  const args = toolCalls[index].function.arguments;
                  if (args.startsWith("{") && args.endsWith("}")) {
                    const parsedArgs = JSON.parse(args);
                    toolCalls[index].function.arguments = JSON.stringify(parsedArgs);
                  }
                } catch (e) {
                  // If parsing fails, arguments are not complete, continue accumulating
                }
              }
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.message.toLowerCase().includes("abort")) {
          logger.info(`[${chatId}] Aborted when LLM response streaming`);
          finalResponse += currentContent;
          // Save current response state
          abortedResponseMap.set(chatId || "", {
            content: finalResponse,
          });
          throw error;
        }
        logger.error(`Error in stream processing: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }

      logger.debug(`[${chatId}] Chunk collected`);

      // filter empty tool calls
      toolCalls = toolCalls.filter((call) => call);

      // Update final response
      finalResponse += currentContent;

      // If no tool calls, end loop
      if (toolCalls.length === 0) {
        hasToolCalls = false;
        break;
      }

      logger.debug(`[${chatId}] Tool calls: ${JSON.stringify(toolCalls, null, 2)}`);
      // support anthropic multiple tool calls version but other not sure
      messages.push(
        new AIMessage({
          content: [
            {
              type: "text",
              // some model not allow empty content in text block
              text: currentContent || ".",
            },
            // Deepseek will recursive when tool_use exist in content
            ...(isDeepseek || isMistralai || isBedrock
              ? []
              : toolCalls.map((toolCall) => {
                let parsedArgs = {}
                try {
                  parsedArgs = toolCall.function.arguments === "" ? {} : JSON.parse(toolCall.function.arguments);
                } catch (error) {
                  toolCall.function.arguments = "{}";
                  logger.error(`[${chatId}] Error parsing tool call ${toolCall.function.name} args: ${error}`);
                }
                return {
                  type: "tool_use",
                  id: toolCall.id,
                  name: toolCall.function.name,
                  input: parsedArgs,
                }
              })),
          ],
          additional_kwargs: {
            tool_calls: toolCalls.map((toolCall) => ({
              id: toolCall.id,
              type: "function",
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              },
            })),
          },
        })
      );

      // Send call info before tool execution
      if (toolCalls.length > 0) {
        onStream?.(
          JSON.stringify({
            type: "tool_calls",
            content: toolCalls.map((call) => {
              logger.info(
                `[Tool Calls] [${call.function.name}] ${JSON.stringify(call.function.arguments || "{}", null, 2)}`
              );
              return {
                name: call.function.name,
                arguments: JSON.parse(call.function.arguments || "{}"),
              };
            }),
          } as iStreamMessage)
        );
      }

      logger.debug(`[${chatId}] Tool calls collected`);

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          try {
            // Check if already aborted
            if (chatId && abortControllerMap.has(chatId)) {
              const controller = abortControllerMap.get(chatId);
              if (controller?.signal.aborted) {
                logger.info(`[${chatId}] Aborted before tool call`);
                throw new Error("ABORTED");
              }
            }

            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            const client = toolToClientMap.get(toolName);

            // Create an AbortSignal for this specific tool call
            const abortController = new AbortController();

            // If there's a chat ID, link this tool call's abort to the main abort
            let mainAbortListener: (() => void) | undefined;
            if (chatId && abortControllerMap.has(chatId)) {
              const mainController = abortControllerMap.get(chatId);
              if (mainController) {
                // If already aborted, throw immediately
                if (mainController.signal.aborted) {
                  throw new Error("ABORTED");
                }
                // Listen for abort
                mainAbortListener = () => {
                  logger.info(`[${chatId}] Aborting tool call [${toolName}]`);
                  abortController.abort();
                };
                mainController.signal.addEventListener("abort", mainAbortListener);
              }
            }

            try {
              const result = await new Promise<any>((resolve, reject) => {
                const executeToolCall = async () => {
                  try {
                    const abortListener = () => {
                      logger.info(`[${chatId}] Tool call [${toolName}] has been aborted`);
                      reject(new Error("ABORTED"));
                    };

                    abortController.signal.addEventListener("abort", abortListener);

                    try {
                      const result = await client?.callTool(
                        {
                          name: toolName,
                          arguments: toolArgs,
                        },
                        undefined,
                        {
                          signal: abortController.signal,
                          timeout: 99999000,
                        }
                      );

                      resolve(result);
                    } catch (error) {
                      reject(error);
                    } finally {
                      abortController.signal.removeEventListener("abort", abortListener);
                    }
                  } catch (error) {
                    reject(error);
                  }
                };

                setImmediate(executeToolCall);
              });

              if (result?.isError) logger.error(`[Tool Result] [${toolName}] ${JSON.stringify(result, null, 2)}`);
              else logger.info(`[Tool Result] [${toolName}] ${JSON.stringify(result, null, 2)}`);

              onStream?.(
                JSON.stringify({
                  type: "tool_result",
                  content: {
                    name: toolName,
                    result: result,
                  },
                } as iStreamMessage)
              );

              return {
                tool_call_id: toolCall.id,
                role: "tool" as const,
                content: JSON.stringify(result),
              };
            } finally {
              if (mainAbortListener && chatId && abortControllerMap.has(chatId)) {
                const mainController = abortControllerMap.get(chatId);
                mainController?.signal.removeEventListener("abort", mainAbortListener);
              }
            }
          } catch (error) {
            if (error instanceof Error && error.message === "ABORTED") {
              // logger.info(`[${chatId}] Tool call has been aborted`);
              throw error; // Re-throw to be caught by the outer try-catch
            }
            throw error;
          }
        })
      );

      logger.debug(`[${chatId}] Tool results collected`);

      // Add tool results to conversation
      if (toolResults.length > 0) {
        messages.push(...toolResults.map((result) => new ToolMessage(result)));
      }

      logger.debug(`[${chatId}] Messages collected and ready to next round`);
    }

    // Log token usage at the end of processing
    logger.debug(
      `[${chatId}] Input tokens: ${tokenUsage.totalInputTokens}, Output tokens: ${tokenUsage.totalOutputTokens}, Total tokens: ${tokenUsage.totalTokens}`
    );

    return { result: finalResponse, tokenUsage };
  } catch (error) {
    const err = error as Error;
    if (err.message.toLowerCase().includes("abort")) {
      // If aborted, return saved response
      logger.info(`[${chatId}] has been aborted`);
      const abortedResponse = abortedResponseMap.get(chatId || "");
      return { result: abortedResponse?.content || finalResponse || "", tokenUsage };
    }
    logger.error(`Error in handleProcessQuery: ${err.message}`);
    throw err;
  } finally {
    // Clean up AbortController
    if (chatId) {
      abortedResponseMap.delete(chatId);
    }
  }
}

function caculateTokenUsage(tokenUsage: TokenUsage, chunk: AIMessageChunk, currentModelSettings: ModelSettings) {
  if (!currentModelSettings) {
    return;
  }

  if (currentModelSettings.configuration?.baseURL?.toLowerCase().includes("silicon")) {
    const usage = chunk.response_metadata.usage;
    tokenUsage.totalInputTokens = usage?.prompt_tokens || 0;
    tokenUsage.totalOutputTokens = usage?.completion_tokens || 0;
    tokenUsage.totalTokens = usage?.total_tokens || 0;
    return;
  }

  switch (currentModelSettings.modelProvider) {
    case "openai":
      if (chunk.response_metadata?.usage) {
        const usage = chunk.response_metadata.usage;
        tokenUsage.totalInputTokens += usage?.prompt_tokens || 0;
        tokenUsage.totalOutputTokens += usage?.completion_tokens || 0;
        tokenUsage.totalTokens += usage?.total_tokens || 0;
      }
      break;
    case "anthropic":
    case "ollama":
      if (chunk.usage_metadata) {
        const usage = chunk.usage_metadata;
        tokenUsage.totalInputTokens += usage?.input_tokens || 0;
        tokenUsage.totalOutputTokens += usage?.output_tokens || 0;
        tokenUsage.totalTokens += usage?.total_tokens || 0;
      }
      break;
    default:
      break;
  }
}