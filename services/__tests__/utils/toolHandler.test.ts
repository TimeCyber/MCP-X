import { setupUtilsMocks } from "../__mocks__/utilsMocks.js";
setupUtilsMocks();

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { convertToOpenAITools, loadConfig, loadConfigAndServers } from "../../utils/toolHandler.js";

jest.mock("fs/promises");
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn(),
}));

describe("ToolHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
  });

  describe("convertToOpenAITools", () => {
    it("should correctly convert to OpenAI tool format", () => {
      const mockTools: Tool[] = [
        {
          name: "test_tool",
          description: "A test tool",
          inputSchema: {
            type: "object",
            properties: {
              text: { type: "string" },
            },
            required: ["text"],
          },
        },
      ];

      const result = convertToOpenAITools(mockTools);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("function");
      expect(result[0].function).toEqual({
        name: "test_tool",
        description: "A test tool",
        parameters: {
          type: "object",
          properties: {
            text: { type: "string" },
          },
          required: ["text"],
          additionalProperties: false,
        },
      });
    });
  });

  describe("loadConfig", () => {
    it("should correctly load configuration file", async () => {
      const mockConfig = {
        mcpServers: {
          server1: {
            command: "test",
            args: [],
          },
        },
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await loadConfig();

      expect(config).toEqual(mockConfig);
      expect(fs.readFile).toHaveBeenCalled();
      expect(path.join).toHaveBeenCalledWith(expect.any(String), "config.json");
    });

    it("should return default configuration when config file doesn't exist", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));

      const config = await loadConfig();

      expect(config).toEqual({ mcpServers: {} });
    });

    it("should use provided path", async () => {
      const customPath = "/custom/path/config.json";
      const mockConfig = { mcpServers: {} };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      await loadConfig(customPath);

      expect(fs.readFile).toHaveBeenCalledWith(customPath, "utf-8");
    });
  });

  describe("loadConfigAndServers", () => {
    it("should correctly load configuration and server list", async () => {
      const mockConfig = {
        mcpServers: {
          server1: { command: "test1", args: [] },
          server2: { command: "test2", args: [] },
        },
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfigAndServers();

      expect(result.config).toEqual(mockConfig);
      expect(result.servers).toEqual(["server1", "server2"]);
    });

    it("should return empty config and server list when config file doesn't exist", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));

      const result = await loadConfigAndServers();

      expect(result.config).toEqual({ mcpServers: {} });
      expect(result.servers).toEqual([]);
    });
  });
});
