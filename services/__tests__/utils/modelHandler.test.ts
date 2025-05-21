import { setupUtilsMocks } from "../__mocks__/utilsMocks.js";
setupUtilsMocks();

import fs from "fs/promises";
import path from "path";
import { loadModelConfig } from "../../utils/modelHandler.js";

jest.mock("fs/promises");
jest.mock("path", () => ({
  join: jest.fn(),
}));

describe("ModelHandler", () => {
  const mockConfig = {
    model_settings: {
      model: "gpt-4o-mini",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
  });

  describe("loadModelConfig", () => {
    it("should successfully load valid model configuration", async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await loadModelConfig();

      expect(config).toEqual(mockConfig);
      expect(fs.readFile).toHaveBeenCalled();
    });

    it("should return null when config file does not exist", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));

      const config = await loadModelConfig();

      expect(config).toBeNull();
    });

    it("should return null when configuration format is invalid", async () => {
      const invalidConfig = {
        model_settings: {
          temperature: "invalid", // should be a number
        },
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await loadModelConfig();

      expect(config).toBeNull();
    });

    it("should use the provided path", async () => {
      const customPath = "/custom/path/modelConfig.json";
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      await loadModelConfig(customPath);

      expect(fs.readFile).toHaveBeenCalledWith(customPath, "utf-8");
    });
  });
});
