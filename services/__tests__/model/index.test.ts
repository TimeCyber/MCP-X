import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import fs from "fs/promises";
import { ModelManager } from "../../models/index.js";
import logger from "../../utils/logger.js";

// Mock external dependencies
jest.mock("../../utils/logger.js");
jest.mock("fs/promises");
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn().mockImplementation((...args) => args.join("/")),
}));

describe("ModelManager", () => {
  let modelManager: ModelManager;
  const mockConfig = {
    activeProvider: "OpenAI",
    configs: {
      OpenAI: {
        model: "gpt-4o-mini",
        temperature: 0.7,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    modelManager = ModelManager.getInstance();
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
  });

  describe("getInstance", () => {
    it("should return the same instance (singleton pattern)", () => {
      const instance1 = ModelManager.getInstance();
      const instance2 = ModelManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should update instance with new config path", () => {
      const customPath = "/custom/path/config.json";
      const instance = ModelManager.getInstance(customPath);
      expect(instance).toBeDefined();
    });
  });

  describe("getModelConfig", () => {
    const mockConfig = {
      activeProvider: "test-provider",
      configs: {
        "test-provider": {
          model: "test-model",
          apiKey: "test-key",
        },
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should successfully get model configuration", async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
      const config = await modelManager.getModelConfig();
      expect(config).toEqual(mockConfig);
    });

    it("should return null when config loading fails", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));
      const config = await modelManager.getModelConfig();
      expect(config).toBeNull();
    });

    it("should use the provided custom path", async () => {
      const customPath = "/custom/path/modelConfig.json";
      const customModelManager = ModelManager.getInstance(customPath);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      await customModelManager.getModelConfig();

      expect(fs.readFile).toHaveBeenCalledWith(customPath, "utf-8");
    });

    it("should use default path when no custom path provided", async () => {
      const defaultPath = "modelConfig.json";
      await modelManager.getModelConfig();
      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining(defaultPath), "utf-8");
    });
  });

  describe("initializeModel", () => {
    it("should successfully initialize model", async () => {
      const model = await modelManager.initializeModel();
      expect(model).toBeDefined();
    });

    it("should return null when configuration doesn't exist", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));
      const model = await modelManager.initializeModel();
      expect(model).toBeNull();
      expect(logger.error).toHaveBeenCalledWith("Error loading model configuration:", expect.any(Error));
    });

    it("should handle old version config format", async () => {
      const oldConfig = {
        model_settings: {
          modelProvider: "TestProvider",
          model: "test-model",
          temperature: 0.5,
        },
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(oldConfig));
      await modelManager.initializeModel();

      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.any(String), "utf-8");
      const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const writtenConfig = JSON.parse(writeFileCall[1]);
      expect(writtenConfig.activeProvider).toBe("TestProvider");
    });

    it("should handle baseURL from configuration", async () => {
      const configWithBaseUrl = {
        activeProvider: "TestProvider",
        configs: {
          TestProvider: {
            model: "test-model",
            temperature: 0.5,
            configuration: {
              baseURL: "http://test.api",
            },
          },
        },
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(configWithBaseUrl));
      await modelManager.initializeModel();
      expect(logger.info).toHaveBeenCalledWith("Model initialized");
    });

    it("should return null when activeProvider settings not found", async () => {
      const invalidConfig = {
        activeProvider: "NonExistentProvider",
        configs: {},
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidConfig));
      const model = await modelManager.initializeModel();
      expect(model).toBeNull();
      expect(logger.error).toHaveBeenCalledWith("Model settings not found for provider: NonExistentProvider");
    });
  });

  describe("getModel", () => {
    it("should return model instance when already initialized", async () => {
      await modelManager.initializeModel();
      const model = await modelManager.getModel();
      expect(model).toBeDefined();
    });

    it("should return null when model is not initialized", () => {
      modelManager["model"] = null;
      const model = modelManager.getModel();
      expect(model).toBeNull();
      expect(logger.error).toHaveBeenCalledWith("Model not initialized");
    });

    it("should return null when model is an empty object", () => {
      modelManager["model"] = {} as BaseChatModel;
      const model = modelManager.getModel();
      expect(model).toBeNull();
      expect(logger.error).toHaveBeenCalledWith("Model not initialized");
    });
  });

  describe("saveModelConfig", () => {
    it("should save new model configuration successfully", async () => {
      const provider = "TestProvider";
      const modelSettings = {
        model: "test-model",
        temperature: 0.5,
        modelProvider: "TestProvider",
      };

      await modelManager.saveModelConfig(provider, modelSettings);

      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.any(String), "utf-8");
      const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const writtenConfig = JSON.parse(writeFileCall[1]);
      expect(writtenConfig.activeProvider).toBe("TestProvider");
      expect(writtenConfig.configs[provider]).toEqual(modelSettings);
    });

    it("should create new config if none exists", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));
      const provider = "TestProvider";
      const modelSettings = {
        model: "test-model",
        temperature: 0.5,
        modelProvider: "TestProvider",
      };

      await modelManager.saveModelConfig(provider, modelSettings);

      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.any(String), "utf-8");
      const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const writtenConfig = JSON.parse(writeFileCall[1]);
      expect(writtenConfig.activeProvider).toBe("TestProvider");
      expect(writtenConfig.configs[provider]).toEqual(modelSettings);
    });

    it("should update existing config", async () => {
      const existingConfig = {
        activeProvider: "ExistingProvider",
        configs: {
          ExistingProvider: {
            model: "old-model",
            temperature: 0.7,
            modelProvider: "ExistingProvider",
          },
        },
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingConfig));

      const provider = "TestProvider";
      const modelSettings = {
        model: "test-model",
        temperature: 0.5,
        modelProvider: "TestProvider",
      };

      await modelManager.saveModelConfig(provider, modelSettings);

      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.any(String), "utf-8");
      const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const writtenConfig = JSON.parse(writeFileCall[1]);
      expect(writtenConfig.activeProvider).toBe("TestProvider");
      expect(writtenConfig.configs[provider]).toEqual(modelSettings);
      expect(writtenConfig.configs.ExistingProvider).toEqual(existingConfig.configs.ExistingProvider);
    });
  });

  describe("generateTitle", () => {
    it("should generate title successfully when model is initialized", async () => {
      const mockModel = {
        invoke: jest.fn().mockResolvedValue({ content: "Test Title" }),
      };
      modelManager["model"] = mockModel as any;

      const title = await modelManager.generateTitle("Test content");
      expect(title).toBe("Test Title");
      expect(mockModel.invoke).toHaveBeenCalled();
    });

    it("should return default title when model is not initialized", async () => {
      modelManager["model"] = null;
      const title = await modelManager.generateTitle("Test content");
      expect(title).toBe("New Chat");
      expect(logger.error).toHaveBeenCalledWith("Model not initialized");
    });
  });

  describe("reloadModel", () => {
    it("should successfully reload model", async () => {
      await modelManager.reloadModel();
      expect(logger.info).toHaveBeenCalledWith("Model reloaded");
    });

    it("should handle errors during model reload", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("Test error"));
      await modelManager.reloadModel();
      expect(logger.error).toHaveBeenCalledWith("Error loading model configuration:", expect.any(Error));
    });
  });
});
