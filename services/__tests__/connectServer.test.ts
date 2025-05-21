import { setupMcpSdkMocks } from "./__mocks__/mcpSdkMocks.js";
import { setupUtilsMocks } from "./__mocks__/utilsMocks.js";
setupMcpSdkMocks();
setupUtilsMocks();

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { handleConnectToServer } from "../connectServer.js";

describe("ConnectServer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should list tools after successful connection", async () => {
    const serverName = "test_server";
    const serverConfig = {
      command: "custom_command",
      args: [],
      env: {},
    };

    const result = await handleConnectToServer(serverName, serverConfig);

    // Verify Client initialization parameters
    expect(Client).toHaveBeenCalledWith({ name: "mcp-client", version: "1.0.0" }, { capabilities: {} });

    // Verify listTools call and results
    expect(result.client.listTools).toHaveBeenCalled();
  });
});
