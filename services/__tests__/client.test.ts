import { setupMcpSdkMocks } from "./__mocks__/mcpSdkMocks.js";
import { setupUtilsMocks } from "./__mocks__/utilsMocks.js";
setupMcpSdkMocks();
setupUtilsMocks();

import fs from "fs/promises";
import { MCPClient } from "../client.js";
import { ModelManager } from "../models/index.js";

jest.mock("fs/promises");
jest.mock("../utils/toolHandler", () => ({
  loadConfig: jest.fn().mockResolvedValue({
    mcpServers: {
      server1: {
        command: "test",
        args: [],
      },
    },
  }),
  loadConfigAndServers: jest.fn().mockResolvedValue({
    config: {
      mcpServers: {
        server1: {
          command: "test",
          args: [],
        },
      },
    },
    servers: ["server1"],
  }),
}));

describe("Client", () => {
  let client: MCPClient;
  const mockConfig = {
    activeProvider: "OpenAI",
    configs: {
      OpenAI: {
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        max_tokens: 1000,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
    client = new MCPClient();
  });

  describe("Initialization", () => {
    it("should correctly initialize client", async () => {
      await client.init();
      expect(ModelManager.getInstance().getModel()).not.toBeNull();
    });

    it("model initialization failure should not throw error", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));
      await expect(client.init()).resolves.toBeUndefined();
      expect(ModelManager.getInstance().getModel()).toBeNull();
    });
  });
});
