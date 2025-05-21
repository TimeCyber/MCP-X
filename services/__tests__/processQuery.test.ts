import { setupMcpSdkMocks } from "./__mocks__/mcpSdkMocks.js";
import { setupUtilsMocks } from "./__mocks__/utilsMocks.js";
setupMcpSdkMocks();
setupUtilsMocks();

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { handleProcessQuery } from "../processQuery.js";
import { imageToBase64 } from "../utils/image.js";
import { iQueryInput } from "../utils/types.js";

jest.mock("../utils/image.js");

describe("ProcessQuery", () => {
  let mockModel: jest.Mocked<BaseChatModel>;
  let mockClient: jest.Mocked<Client>;
  let mockToolToClientMap: Map<string, Client>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock model
    mockModel = {
      stream: jest.fn(),
      invoke: jest.fn(),
      bind: jest.fn(),
      bindTools: jest.fn().mockImplementation(() => mockModel),
      lc_kwargs: {
        defaultConfig: {
          modelProvider: "openai",
          baseURL: "https://api.openai.com/v1",
        },
      },
    } as any;

    // Mock client
    mockClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      listTools: jest.fn(),
    } as any;

    mockToolToClientMap = new Map([["test_tool", mockClient]]);

    (imageToBase64 as jest.Mock).mockResolvedValue("data:image/jpeg;base64,mockBase64");
  });

  describe("handleProcessQuery", () => {
    it("should correctly handle plain text query", async () => {
      const input = "Hello, how are you?";
      const history: any[] = [];
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { content: "I'm fine" };
        },
      };

      mockModel.stream.mockResolvedValue(mockStream as any);

      const result = await handleProcessQuery(mockToolToClientMap, [], mockModel, input, history);

      expect(result).toBe("I'm fine");
      expect(mockModel.stream).toHaveBeenCalledWith([new HumanMessage(input)]);
    });

    it("should correctly handle query with system prompt", async () => {
      const input = "Hello";
      const systemPrompt = "You are a helpful assistant";
      const history = [new SystemMessage(systemPrompt)];
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { content: "Hello! How can I help you?" };
        },
      };

      mockModel.stream.mockResolvedValue(mockStream as any);

      const result = await handleProcessQuery(mockToolToClientMap, [], mockModel, input, history);

      expect(result).toBe("Hello! How can I help you?");
      expect(mockModel.stream).toHaveBeenCalledWith([new SystemMessage(systemPrompt), new HumanMessage(input)]);
    });

    it("should correctly handle query with images", async () => {
      const input: iQueryInput = {
        text: "What's in this image?",
        images: ["test.jpg"],
      };
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { content: "I see a test image" };
        },
      };

      mockModel.stream.mockResolvedValue(mockStream as any);

      const result = await handleProcessQuery(mockToolToClientMap, [], mockModel, input, []);

      expect(result).toBe("I see a test image");
      expect(mockModel.stream).toHaveBeenCalled();
      expect(imageToBase64).toHaveBeenCalledWith("test.jpg");
    });

    it("should correctly handle tool calls", async () => {
      const input = "Use the test tool";
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            content: null,
            tool_calls: [
              {
                id: "1",
                type: "function",
                function: {
                  name: "test_tool",
                  arguments: JSON.stringify({ param: "test" }),
                },
              },
            ],
          };
          yield { content: "Tool called successfully" };
        },
      };

      mockModel.stream.mockResolvedValue(mockStream as any);

      const result = await handleProcessQuery(
        mockToolToClientMap,
        [
          {
            name: "test_tool",
            description: "A test tool",
            schema: {} as any,
          },
        ],
        mockModel,
        input,
        []
      );

      expect(result).toBe("Tool called successfully");
    });

    it("should correctly handle stream output", async () => {
      const input = "Stream test";
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { content: "Part 1" };
          yield { content: "Part 2" };
        },
      };
      const onStream = jest.fn();

      mockModel.stream.mockResolvedValue(mockStream as any);

      await handleProcessQuery(mockToolToClientMap, [], mockModel, input, [], onStream);

      expect(onStream).toHaveBeenCalledTimes(2);
      expect(onStream).toHaveBeenNthCalledWith(
        1,
        JSON.stringify({
          type: "text",
          content: "Part 1",
        })
      );
      expect(onStream).toHaveBeenNthCalledWith(
        2,
        JSON.stringify({
          type: "text",
          content: "Part 2",
        })
      );
    });

    it("should throw error when model is not initialized", async () => {
      const input = "Test";

      await expect(handleProcessQuery(mockToolToClientMap, [], null, input, [])).rejects.toThrow(
        "Model not initialized"
      );
    });

    it("should correctly handle tool call errors", async () => {
      const input = "Use the test tool";
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            content: null,
            tool_calls: [
              {
                id: "1",
                type: "function",
                function: {
                  name: "nonexistent_tool",
                  arguments: "{}",
                },
              },
            ],
          };
        },
      };

      mockModel.stream.mockResolvedValue(mockStream as any);

      const result = await handleProcessQuery(
        mockToolToClientMap,
        [
          {
            name: "test_tool",
            description: "A test tool",
            schema: {} as any,
          },
        ],
        mockModel,
        input,
        []
      );

      expect(result).toBe("");
    });
  });
});
