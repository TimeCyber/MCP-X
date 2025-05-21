export const mockClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  listTools: jest.fn().mockResolvedValue({
    tools: [
      {
        name: "test_tool",
        description: "A test tool",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  }),
  getServerCapabilities: jest.fn().mockResolvedValue({
    description: "Tool Description",
    icon: "Tool Icon",
    tools: {},
  }),
};

export const mockStdioTransport = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
};

// Mock modules
export const setupMcpSdkMocks = () => {
  jest.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
    __esModule: true,
    Client: jest.fn().mockImplementation(() => mockClient),
  }));

  jest.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
    __esModule: true,
    StdioClientTransport: jest.fn().mockImplementation(() => mockStdioTransport),
  }));
};

// Reset all mocks
export const resetMcpSdkMocks = () => {
  Object.values(mockClient).forEach((mock) => {
    if (typeof mock.mockReset === "function") {
      mock.mockReset();
    }
  });

  Object.values(mockStdioTransport).forEach((mock) => {
    if (typeof mock.mockReset === "function") {
      mock.mockReset();
    }
  });
};
