import { ToolDefinition } from "@langchain/core/language_models/base";
import express, { Response } from "express";
import { initChatModel } from "langchain/chat_models/universal";
import logger from "../utils/logger.js";
import { ModelSettings, ModelVerificationResult, ModelVerificationStreamResponse } from "../utils/types.js";

type SSEResponse = Response;

class ModelVerificationService {
  private formatVerificationResults(results: ModelVerificationResult[], aborted: boolean) {
    return {
      type: "final",
      results: results.map((r) => ({
        modelName: r.modelName,
        connection: {
          status: r.connectingStatus,
          result: r.connectingResult,
        },
        tools: {
          status: r.supportToolsStatus,
          result: r.supportToolsResult,
        },
      })),
      aborted,
    };
  }

  private async testModelConnection(
    model: any,
    modelName: string,
    signal: AbortSignal
  ): Promise<{ status: "success" | "warning" | "error"; result: any }> {
    try {
      const result = await model.invoke("Only return 'Hi' strictly", { signal });
      return {
        status: result.content ? "success" : "warning",
        result,
      };
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        logger.warn(`Model connection test aborted for ${modelName}`);
      }
      return {
        status: "error",
        result: (error as Error).message,
      };
    }
  }

  private async testModelTools(
    model: any,
    modelName: string,
    signal: AbortSignal
  ): Promise<{ status: "success" | "warning" | "error"; result: any }> {
    try {
      let fullResponse = "";
      let hasGenToolCall = false;

      for await (const chunk of await model.stream("Use [web_search] tool to search 'iphone16'", {
        tools: testTools,
        signal,
      })) {
        fullResponse += chunk.content || "";
        if (
          (chunk.tool_calls && chunk.tool_calls.length > 0) ||
          (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0)
        ) {
          hasGenToolCall = true;
        }
      }

      return {
        status: hasGenToolCall ? "success" : "warning",
        result: fullResponse,
      };
    } catch (error) {
      logger.error(`[ModelVerify] error: ${JSON.stringify(error, null, 2)}`);
      if ((error as { name?: string })?.name === "AbortError") {
        logger.warn(`Model tools test aborted for ${modelName}`);
      }
      return {
        status: "error",
        result: (error as Error).message,
      };
    }
  }

  private async verifyModel(
    settings: ModelSettings,
    onProgress: (response: ModelVerificationStreamResponse) => void,
    signal: AbortSignal,
    currentStep: number
  ): Promise<ModelVerificationResult> {
    const modelName = settings.model;
    const baseUrl = settings.configuration?.baseURL || settings.baseURL || "";

    const model = await initChatModel(modelName, {
      ...settings,
      baseUrl,
      max_tokens: 100,
    });

    const modelResult: ModelVerificationResult = {
      modelName,
      connectingStatus: "error",
      connectingResult: undefined,
      supportToolsStatus: "error",
      supportToolsResult: undefined,
    };

    // Test connection
    const connectionTest = await this.testModelConnection(model, modelName, signal);
    modelResult.connectingStatus = connectionTest.status;
    modelResult.connectingResult = connectionTest.result;

    onProgress({
      type: "progress",
      step: currentStep + 1,
      modelName,
      testType: "connection",
      status: connectionTest.status,
      error: connectionTest.status === "error" ? connectionTest.result : undefined,
    });

    // Test tools support
    const toolsTest = await this.testModelTools(model, modelName, signal);
    modelResult.supportToolsStatus = toolsTest.status;
    modelResult.supportToolsResult = toolsTest.result;

    onProgress({
      type: "progress",
      step: currentStep + 2,
      modelName,
      testType: "tools",
      status: toolsTest.status,
      error: toolsTest.status === "error" ? toolsTest.result : undefined,
    });

    logger.info(
      `Model verification for ${modelName} - connecting: ${modelResult.connectingStatus}, supportTools: ${modelResult.supportToolsStatus}`
    );

    return modelResult;
  }

  private setupSSE(res: SSEResponse) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    return (text: string) => {
      res.write(`data: ${JSON.stringify({ message: text })}\n\n`);
    };
  }

  private handleStreamError(error: Error, res: SSEResponse) {
    logger.error(`Stream error: ${error.message}`);
    const response = {
      type: "error",
      content: error.message,
    };
    res.write(`data: ${JSON.stringify({ message: response })}\n\n`);
    res.end();
  }

  async handleStreamingVerification(req: express.Request, res: SSEResponse) {
    const onStream = this.setupSSE(res);
    let isConnectionDestroyed = false;
    const abortController = new AbortController();

    req.socket.once("close", () => {
      isConnectionDestroyed = true;
      abortController.abort();
    });

    try {
      const { modelSettings } = req.body;
      if (!modelSettings) {
        onStream(
          JSON.stringify({
            type: "error",
            message: "Config is required",
          })
        );
        res.end();
        return;
      }

      const models = Array.isArray(modelSettings) ? modelSettings : [modelSettings];
      const totalSteps = models.length * 2;
      const finalResults: ModelVerificationResult[] = [];

      for (let i = 0; i < models.length; i++) {
        if (isConnectionDestroyed || req.socket.destroyed) {
          logger.warn("Connection was closed by client");
          onStream(JSON.stringify(this.formatVerificationResults(finalResults, true)));
          res.end();
          return;
        }

        const result = await this.verifyModel(
          models[i],
          (response) => onStream(JSON.stringify({ ...response, totalSteps })),
          abortController.signal,
          i * 2
        );
        finalResults.push(result);
      }

      onStream(JSON.stringify(this.formatVerificationResults(finalResults, false)));
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        logger.warn("Model verification was aborted");
      }
      logger.error(`Model verification error: ${(error as Error).message}`);
      this.handleStreamError(error as Error, res);
    }
  }
}

export function modelVerifyRouter() {
  const router = express.Router();
  const verificationService = new ModelVerificationService();

  router.post("/streaming", (req, res) => {
    verificationService.handleStreamingVerification(req, res);
  });

  return router;
}

const testTools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Web search",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
] as ToolDefinition[];
