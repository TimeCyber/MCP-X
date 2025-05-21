import { ToolDefinition } from "@langchain/core/language_models/base";
import axios from "axios";
import express, { Response } from "express";
import fs from "fs/promises";
import { initChatModel } from "langchain/chat_models/universal";
import multer from "multer";
import path from "path";
import { MCPClient } from "./client.js";
import {
  DatabaseMode,
  getChatWithMessages,
  getDatabaseMode,
  getNextAIMessage,
  updateMessageContent,
} from "./database/index.js";
import { PromptManager } from "./prompt/index.js";
import { createRouter } from "./routes/_index.js";
import { handleUploadFiles } from "./utils/fileHandler.js";
import logger from "./utils/logger.js";
import { iQueryInput, iStreamMessage, ModelSettings } from "./utils/types.js";
import envPaths from "env-paths";

interface FileProcessingResult {
  images: string[];
  documents: string[];
}

type SSEResponse = Response;

const envPath = envPaths("mcpx", {suffix: ""})
const PROJECT_ROOT = envPath.data

const OFFLINE_MODE = true

export class WebServer {
  private app;
  private mcpClient;
  private promptManager;
  private upload;
  public port: number | undefined;

  constructor(mcpClient: MCPClient) {
    this.app = express();
    this.mcpClient = mcpClient;
    this.promptManager = PromptManager.getInstance();
    this.port = undefined;

    // resolve cors
    this.app.use((req: any, res: any, next: any) => {
      res.header("Access-Control-Allow-Origin", "http://localhost:5173");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");

      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }

      next();
    });

    // Set up file upload
    const storage = multer.diskStorage({
      //@ts-ignore
      destination: (req, file, cb) => {
        const uploadDir = path.join(PROJECT_ROOT, "uploads");
        // Ensure upload directory exists
        fs.mkdir(uploadDir, { recursive: true })
          .then(() => cb(null, uploadDir))
          .catch((err) => cb(err, uploadDir));
      },
      //@ts-ignore
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      },
    });

    this.upload = multer({
      storage: storage,
      limits: {
        // remove limit
      },
    }).array("files"); // remove limit

    // Set up template engine
    this.app.set("view engine", "ejs");
    this.app.set("views", path.join(PROJECT_ROOT, "views"));

    // Middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(PROJECT_ROOT, "views/public")));
    this.app.use("/uploads", express.static(path.join(PROJECT_ROOT, "uploads")));

    this.setupRoutes();
  }

  private setupSSE(res: SSEResponse) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    return (text: any) => {
      const messageObj = typeof text === 'string' ? JSON.parse(text) : text;
      res.write(`data: ${JSON.stringify({ message: JSON.stringify(messageObj) })}\n\n`);
    };
  }

  private async processFiles(files: Express.Multer.File[], bodyFilepaths: any): Promise<FileProcessingResult> {
    let filepaths: string[] = [];

    if (bodyFilepaths) {
      if (OFFLINE_MODE) {
        filepaths = typeof bodyFilepaths === "string" ? JSON.parse(bodyFilepaths || "[]") : bodyFilepaths;
      } else {
        logger.error("filepaths arg is not allowed in online mode");
      }
    }

    // Only allow files parameter in offline mode
    if (!OFFLINE_MODE) files = [];

    if (files?.length > 0 || filepaths?.length > 0) {
      const processFiles = {
        files: files,
        filepaths: filepaths,
      } as { files: Express.Multer.File[]; filepaths: string[] };
      return await handleUploadFiles(processFiles);
    }

    return { images: [], documents: [] };
  }

  private handleStreamError(error: Error, res: SSEResponse) {
    logger.error(`Stream error: ${error.message}`);
    const response = {
      type: "error",
      content: error.message,
    } as iStreamMessage;
    res.write(`data: ${JSON.stringify({ message: response })}\n\n`);
    res.end();
  }

  private async prepareQueryInput(
    message: string | undefined,
    files: Express.Multer.File[],
    bodyFilepaths: any
  ): Promise<iQueryInput> {
    const queryInput: iQueryInput = {};

    if (message) {
      queryInput.text = message;
    }

    const { images, documents } = await this.processFiles(files, bodyFilepaths);
    if (images.length > 0) queryInput.images = OFFLINE_MODE ? images : [];
    if (documents.length > 0) queryInput.documents = OFFLINE_MODE ? documents : [];

    return queryInput;
  }

  private setupRoutes() {
    this.app.use("/", createRouter());

    // API endpoint for sending messages
    this.app.post("/api/chat", (req, res) => {
      this.upload(req, res, async (err) => {
        if (err) {
          logger.error(`File upload error: ${err.message}`);
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }

        try {
          const { message, chatId, fingerprint, user_access_token } = req.body;
          if (getDatabaseMode() === DatabaseMode.API) {
            if (!fingerprint && !user_access_token) {
              return res.status(400).json({
                success: false,
                message: "Fingerprint or user_access_token is required",
              });
            }
          }

          let files = req.files as Express.Multer.File[];

          if (!message && (!files || files.length === 0)) {
            return res.status(400).json({
              success: false,
              message: "Message or Files are required",
            });
          }

          const onStream = this.setupSSE(res);
          const queryInput = await this.prepareQueryInput(message, files, req.body.filepaths);

          await this.mcpClient.processQuery(chatId, queryInput, onStream, undefined, fingerprint, user_access_token);

          res.write("data: [DONE]\n\n");
          res.end();
        } catch (error) {
          this.handleStreamError(error as Error, res);
        }
      });
    });

    // Add edit message endpoint
    this.app.post("/api/chat/edit", (req, res) => {
      this.upload(req, res, async (err) => {
        if (err) {
          logger.error(`File upload error: ${err.message}`);
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }

        try {
          const { chatId, messageId, content, fingerprint, user_access_token } = req.body;
          if (getDatabaseMode() === DatabaseMode.API) {
            if (!fingerprint && !user_access_token) {
              return res.status(400).json({
                success: false,
                message: "Fingerprint or user_access_token is required",
              });
            }
          }

          if (!chatId || !messageId) {
            return res.status(400).json({
              success: false,
              message: "Chat ID and Message ID are required",
            });
          }

          const onStream = this.setupSSE(res);
          const files = req.files as Express.Multer.File[];
          const queryInput = await this.prepareQueryInput(content, files, req.body.filepaths);

          await updateMessageContent(messageId, queryInput);

          const nextAIMessage = await getNextAIMessage(chatId, messageId);
          if (!nextAIMessage) {
            logger.warn(`No AI message found after user message ${messageId}`);
          }

          await this.mcpClient.processQuery(
            chatId,
            queryInput,
            onStream,
            nextAIMessage?.messageId,
            fingerprint,
            user_access_token
          );

          res.write("data: [DONE]\n\n");
          res.end();
        } catch (error) {
          this.handleStreamError(error as Error, res);
        }
      });
    });

    //@ts-ignore
    this.app.post("/api/chat/retry", async (req, res) => {
      const { chatId, messageId, fingerprint, user_access_token } = req.body;
      if (getDatabaseMode() === DatabaseMode.API) {
        if (!fingerprint && !user_access_token) {
          return res.status(400).json({
            success: false,
            message: "Fingerprint or user_access_token is required",
          });
        }
      }
      if (!chatId || !messageId) {
        return res.status(400).json({
          success: false,
          message: "Chat ID and Message ID are required",
        });
      }
      try {
        const onStream = this.setupSSE(res);
        await this.mcpClient.processQuery(chatId, "", onStream, messageId, fingerprint, user_access_token);
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (error) {
        this.handleStreamError(error as Error, res);
      }
    });

    this.app.post("/api/modelVerify", async (req, res) => {
      try {
        const { modelSettings } = req.body;
        if (!modelSettings) {
          res.json({
            success: false,
            message: "Config is required",
          });
          return;
        }
        const modelName = (modelSettings as ModelSettings).model;
        const baseUrl =
          (modelSettings as ModelSettings).configuration?.baseURL || (modelSettings as ModelSettings).baseURL || "";
        const model = await initChatModel(modelName, {
          ...(modelSettings as ModelSettings),
          baseUrl,
          max_tokens: 100,
        });

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
                  }
                },
                required: ["query"],
                additionalProperties: false,
              },
            },
          },
        ] as ToolDefinition[];

        let connectingSuccess = false;
        let connectingResult = null;
        let supportTools = false;
        let supportToolsResult = null;

        // check if model can connect
        try {
          const result = await model.invoke("Only return 'Hi' strictly");
          connectingSuccess = true;
          connectingResult = result;
        } catch (error) {
          logger.error(`Model verification error: ${(error as Error).message}`);
          res.json({
            connectingSuccess: false,
            connectingResult: (error as Error).message,
          });
          return;
        }

        // check if support tools
        try {
          const result = await model.invoke("Use [web_search] tool to search 'iphone16'", {
            tools: testTools,
          });
          supportTools = true;
          supportToolsResult = result;
        } catch (error) {
          logger.error(`Model verification error: ${(error as Error).message}`);
          supportTools = false;
          supportToolsResult = (error as Error).message;
        }

        logger.info(`Model verification success - connecting: ${connectingSuccess}, supportTools: ${supportTools}`);

        res.json({
          success: true,
          connectingSuccess,
          connectingResult,
          supportTools,
          supportToolsResult,
        });
      } catch (error) {
        logger.error(`Model verification error: ${(error as Error).message}`);
        res.json({
          success: false,
          message: (error as Error).message,
        });
      }
    });
  }

  start(port: number = 4321): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = this.app
        .listen(port, () => {
          const address = server.address();
          const actualPort = typeof address === "object" && address ? address.port : port;
          logger.info(`Web server running at http://localhost:${actualPort}`);
          this.port = actualPort;
          resolve(actualPort);
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }
}
