import { setupMcpSdkMocks } from "../__mocks__/mcpSdkMocks.js";
import { setupUtilsMocks } from "../__mocks__/utilsMocks.js";
setupMcpSdkMocks();
setupUtilsMocks();

import { jest } from "@jest/globals";
import * as connectServer from "../../connectServer.js";
import { MCPServerManager } from "../../mcpServer/index.js";
import * as toolHandler from "../../utils/toolHandler.js";
import type { iServerConfig } from "../../utils/types.js";

// Define mock types
type MockClient = {
  listTools: jest.Mock;
  getServerCapabilities: jest.Mock;
  transport: {
    _serverParams: iServerConfig;
  };
};

type MockTransport = {
  close: jest.Mock;
};

type MockToolDefinition = {
  type: "function";
  name: string;
  description: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

jest.mock("../../connectServer.js");
jest.mock("../../utils/toolHandler.js");

describe("MCPServerManager", () => {
  let manager: MCPServerManager;
  const mockTools = [
    { name: "tool1", description: "Tool 1 description" },
    { name: "tool2", description: "Tool 2 description" },
  ];

  const mockServerConfig: iServerConfig = {
    enabled: true,
    command: "test-command",
    args: [],
  };

  const mockClient: MockClient = {
    listTools: jest.fn().mockResolvedValue({
      tools: mockTools,
    } as never),
    getServerCapabilities: jest.fn().mockResolvedValue({
      description: "Test server description",
      icon: "test-icon",
    } as never),
    transport: {
      _serverParams: mockServerConfig,
    },
  };

  const mockTransport: MockTransport = {
    close: jest.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset MCPServerManager instance
    (MCPServerManager as any).instance = undefined;

    // Set up basic mock responses
    (connectServer.handleConnectToServer as jest.Mock).mockResolvedValue({
      client: mockClient,
      transport: mockTransport,
    } as never);

    (toolHandler.loadConfigAndServers as jest.Mock).mockResolvedValue({
      config: {
        mcpServers: {
          testServer: mockServerConfig,
        },
      },
      servers: ["testServer"],
    } as never);

    // Set up convertToOpenAITools mock
    (toolHandler.convertToOpenAITools as jest.Mock).mockReturnValue(
      mockTools.map(
        (tool) =>
          ({
            type: "function",
            name: tool.name,
            description: tool.description,
            function: {
              name: tool.name,
              description: tool.description,
              parameters: {},
            },
          } as MockToolDefinition)
      )
    );
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = MCPServerManager.getInstance();
      const instance2 = MCPServerManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should update configuration when new path is provided", async () => {
      const instance = MCPServerManager.getInstance();
      const newConfigPath = "/new/config/path";
      const updatedInstance = MCPServerManager.getInstance(newConfigPath);

      expect(updatedInstance.configPath).toBe(newConfigPath);
      expect(instance).toBe(updatedInstance);
    });

    it("should trigger reinitialization when new config path is provided", async () => {
      const instance = MCPServerManager.getInstance();
      const spy = jest.spyOn(instance, "initialize");
      const newConfigPath = "/new/config/path";

      MCPServerManager.getInstance(newConfigPath);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("initialize", () => {
    it("should correctly initialize and connect all servers", async () => {
      const manager = MCPServerManager.getInstance();
      await manager.initialize();

      expect(toolHandler.loadConfigAndServers).toHaveBeenCalledWith(manager.configPath);
      expect(connectServer.handleConnectToServer).toHaveBeenCalledWith("testServer", mockServerConfig);
      expect(mockClient.listTools).toHaveBeenCalled();
      expect(mockClient.getServerCapabilities).toHaveBeenCalled();
    });
  });

  describe("connectAllServers", () => {
    it("should successfully connect to all enabled servers", async () => {
      const manager = MCPServerManager.getInstance();
      await manager.connectAllServers();

      const toolInfos = manager.getToolInfos();
      expect(toolInfos).toHaveLength(1);
      expect(toolInfos[0]).toMatchObject({
        name: "testServer",
        description: "Test server description",
        enabled: true,
        icon: "test-icon",
      });
    });

    it("should handle errors correctly when server connection fails", async () => {
      const errorMessage = "Connection failed";
      (connectServer.handleConnectToServer as jest.Mock).mockRejectedValueOnce(new Error(errorMessage) as never);

      const manager = MCPServerManager.getInstance();
      await manager.connectAllServers();

      expect(manager.getToolInfos()).toHaveLength(0);
      expect(manager.getAvailableTools()).toHaveLength(0);
    });

    it("should not load tools when server is disabled", async () => {
      (toolHandler.loadConfigAndServers as jest.Mock).mockResolvedValueOnce({
        config: {
          mcpServers: {
            testServer: { ...mockServerConfig, enabled: false },
          },
        },
        servers: ["testServer"] as string[],
      } as never);

      const manager = MCPServerManager.getInstance();
      await manager.connectAllServers();

      expect(manager.getAvailableTools()).toHaveLength(0);
    });
  });

  describe("disconnectAllServers", () => {
    it("should correctly disconnect all servers", async () => {
      const manager = MCPServerManager.getInstance();
      await manager.initialize();
      await manager.disconnectAllServers();

      expect(mockTransport.close).toHaveBeenCalled();
      expect(manager.getAvailableTools()).toHaveLength(0);
      expect(manager.getToolInfos()).toHaveLength(0);
      expect(manager.getToolToServerMap().size).toBe(0);
    });

    it("should continue processing other servers even if some disconnections fail", async () => {
      const manager = MCPServerManager.getInstance();
      await manager.initialize();

      // Mock first close failure
      mockTransport.close.mockImplementationOnce(() => {
        console.error("Failed to close connection");
        return Promise.resolve();
      });

      await manager.disconnectAllServers();

      // Verify that state is properly cleaned up even if errors occur
      expect(manager.getAvailableTools()).toHaveLength(0);
      expect(manager.getToolInfos()).toHaveLength(0);
      expect(manager.getToolToServerMap().size).toBe(0);
    });
  });

  describe("server reconnection", () => {
    it("should successfully disconnect and reconnect all servers", async () => {
      const manager = MCPServerManager.getInstance();
      await manager.disconnectAllServers();
      await manager.connectAllServers();

      expect(manager.getAvailableTools()).toHaveLength(2);
      expect(manager.getToolInfos()).toHaveLength(1);
    });

    it("should sync servers with latest configuration", async () => {
      const manager = MCPServerManager.getInstance();
      const newServerConfig = { ...mockServerConfig, command: "new-command" };

      (toolHandler.loadConfigAndServers as jest.Mock).mockResolvedValueOnce({
        config: {
          mcpServers: {
            testServer: newServerConfig,
          },
        },
        servers: ["testServer"] as string[],
      } as never);

      await manager.syncServersWithConfig();

      expect(connectServer.handleConnectToServer).toHaveBeenCalledWith("testServer", newServerConfig);
    });
  });

  describe("getToolToServerMap", () => {
    it("should return correct tool to server mapping", async () => {
      const manager = MCPServerManager.getInstance();
      await manager.initialize();

      const toolMap = manager.getToolToServerMap();
      expect(toolMap.size).toBe(2);
      expect(toolMap.get("tool1")).toBe(mockClient);
      expect(toolMap.get("tool2")).toBe(mockClient);
    });

    it("should return empty mapping when no servers are connected", async () => {
      const manager = MCPServerManager.getInstance();
      const toolMap = manager.getToolToServerMap();
      expect(toolMap.size).toBe(0);
    });
  });

  describe("syncServersWithConfig", () => {
    it("should remove servers that are no longer in config", async () => {
      const manager = MCPServerManager.getInstance();
      await manager.initialize();

      // Mock new config without the test server
      (toolHandler.loadConfigAndServers as jest.Mock).mockResolvedValueOnce({
        config: {
          mcpServers: {},
        },
        servers: [] as string[],
      } as never);

      await manager.syncServersWithConfig();

      expect(mockTransport.close).toHaveBeenCalled();
      expect(manager.getToolInfos()).toHaveLength(0);
    });

    it("should add new servers from config", async () => {
      const manager = MCPServerManager.getInstance();
      const newServerConfig = { ...mockServerConfig };

      // Mock config with an additional server
      (toolHandler.loadConfigAndServers as jest.Mock).mockResolvedValueOnce({
        config: {
          mcpServers: {
            testServer: mockServerConfig,
            newServer: newServerConfig,
          },
        },
        servers: ["testServer", "newServer"] as string[],
      } as never);

      await manager.syncServersWithConfig();

      expect(connectServer.handleConnectToServer).toHaveBeenCalledWith("newServer", newServerConfig);
    });

    it("should update server when properties change", async () => {
      const manager = MCPServerManager.getInstance();
      await manager.initialize();

      const updatedConfig = {
        ...mockServerConfig,
        command: "updated-command",
        args: ["--new-arg"],
      };

      // reset client's _serverParams
      (mockClient as any).transport._serverParams = mockServerConfig;

      (toolHandler.loadConfigAndServers as jest.Mock).mockResolvedValueOnce({
        config: {
          mcpServers: {
            testServer: updatedConfig,
          },
        },
        servers: ["testServer"] as string[],
      } as never);

      await manager.syncServersWithConfig();

      // Should disconnect and reconnect with new config
      expect(mockTransport.close).toHaveBeenCalled();
      expect(connectServer.handleConnectToServer).toHaveBeenCalledWith("testServer", updatedConfig);
    });

    it("should handle enable/disable server state changes", async () => {
      const manager = MCPServerManager.getInstance();
      await manager.initialize();

      // reset client's _serverParams
      (mockClient as any).transport._serverParams = mockServerConfig;

      // Mock config with disabled server
      const disabledConfig = { ...mockServerConfig, enabled: false };
      (toolHandler.loadConfigAndServers as jest.Mock).mockResolvedValueOnce({
        config: {
          mcpServers: {
            testServer: disabledConfig,
          },
        },
        servers: ["testServer"] as string[],
      } as never);

      await manager.syncServersWithConfig();

      // Should still be connected but tools should be removed
      expect(mockTransport.close).not.toHaveBeenCalled();
      expect(manager.getAvailableTools()).toHaveLength(0);

      // Re-enable the server
      const enabledConfig = { ...mockServerConfig, enabled: true };
      (toolHandler.loadConfigAndServers as jest.Mock).mockResolvedValueOnce({
        config: {
          mcpServers: {
            testServer: enabledConfig,
          },
        },
        servers: ["testServer"] as string[],
      } as never);

      await manager.syncServersWithConfig();
      expect(manager.getAvailableTools()).toHaveLength(2);
    });

    it("should handle connection errors during sync", async () => {
      const manager = MCPServerManager.getInstance();
      const errorMessage = "Connection failed";

      // initialize an empty manager
      await manager.initialize();

      // Mock config with both servers
      (toolHandler.loadConfigAndServers as jest.Mock).mockResolvedValueOnce({
        config: {
          mcpServers: {
            errorServer: mockServerConfig,
          },
        },
        servers: ["errorServer"] as string[],
      } as never);

      // Mock connection error for errorServer
      (connectServer.handleConnectToServer as jest.Mock).mockRejectedValueOnce(new Error(errorMessage) as never);

      const errors = await manager.syncServersWithConfig();

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        serverName: "errorServer",
        error: errorMessage,
      });
      // No servers should be connected due to error
      expect(manager.getToolInfos()).toHaveLength(0);
    });
  });
});
