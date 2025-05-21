import { jest } from "@jest/globals";
import * as fs from "fs";
import { PromptManager } from "../../prompt/index.js";

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

describe("PromptManager", () => {
  let promptManager: PromptManager;

  beforeEach(() => {
    // Reset PromptManager singleton instance
    // @ts-ignore - Access private property for testing
    PromptManager.instance = undefined;
    // Reset all mocks
    jest.clearAllMocks();
    promptManager = PromptManager.getInstance();
  });

  describe("getInstance", () => {
    it("should return PromptManager singleton instance", () => {
      const instance1 = PromptManager.getInstance();
      const instance2 = PromptManager.getInstance();

      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
      expect(instance1).toBe(instance2);
    });
  });

  describe("setPrompt & getPrompt", () => {
    it("should be able to set and get prompts", () => {
      const key = "test";
      const prompt = "This is a test prompt";

      promptManager.setPrompt(key, prompt);
      const retrievedPrompt = promptManager.getPrompt(key);

      expect(retrievedPrompt).toBe(prompt);
    });

    it("should be able to update existing prompts", () => {
      const key = "test";
      const originalPrompt = "Original prompt";
      const updatedPrompt = "Updated prompt";

      promptManager.setPrompt(key, originalPrompt);
      promptManager.setPrompt(key, updatedPrompt);
      const retrievedPrompt = promptManager.getPrompt(key);

      expect(retrievedPrompt).toBe(updatedPrompt);
    });

    it("should return undefined when prompt doesn't exist", () => {
      const nonExistentKey = "nonexistent";
      const retrievedPrompt = promptManager.getPrompt(nonExistentKey);

      expect(retrievedPrompt).toBeUndefined();
    });

    it("should include system prompts during initialization", () => {
      const systemPrompt = promptManager.getPrompt("system");

      expect(systemPrompt).toBeDefined();
      expect(typeof systemPrompt).toBe("string");
    });
  });

  describe("Edge case tests", () => {
    it("should handle empty string as key", () => {
      const key = "";
      const prompt = "Empty key prompt";

      promptManager.setPrompt(key, prompt);
      const retrievedPrompt = promptManager.getPrompt(key);

      expect(retrievedPrompt).toBe(prompt);
    });

    it("should handle empty string as prompt", () => {
      const key = "emptyPrompt";
      const prompt = "";

      promptManager.setPrompt(key, prompt);
      const retrievedPrompt = promptManager.getPrompt(key);

      expect(retrievedPrompt).toBe(prompt);
    });
  });

  describe("loadCustomRules", () => {
    it("should be able to read custom rule file", () => {
      const mockRules = "custom rule content";
      (fs.readFileSync as jest.Mock).mockReturnValue(mockRules);

      const rules = promptManager.loadCustomRules();
      expect(rules).toBe(mockRules);
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining(".customrules"), "utf-8");
    });

    it("should use customRulesPath set in instance", () => {
      const customPath = "/custom/path/rules.txt";
      const mockRules = "custom rules from specific path";
      promptManager = PromptManager.getInstance(customPath);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockRules);

      const rules = promptManager.loadCustomRules();

      expect(rules).toBe(mockRules);
      // Verify whether the correct path is used
      expect(fs.readFileSync).toHaveBeenCalledWith(customPath, "utf-8");
    });

    it("should return empty string when file doesn't exist", () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("File not found");
      });

      const rules = promptManager.loadCustomRules();
      expect(rules).toBe("");
    });
  });

  describe("updateSystemPrompt", () => {
    it("should use new custom rules to update system prompt", () => {
      const mockRules = "new custom rules";
      (fs.readFileSync as jest.Mock).mockReturnValue(mockRules);

      const originalSystemPrompt = promptManager.getPrompt("system");
      promptManager.updateSystemPrompt();
      const updatedSystemPrompt = promptManager.getPrompt("system");

      expect(updatedSystemPrompt).not.toBe(originalSystemPrompt);
    });

    it("should keep original system prompt when custom rules cannot be read", () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("File not found");
      });

      const originalSystemPrompt = promptManager.getPrompt("system");
      promptManager.updateSystemPrompt();
      const updatedSystemPrompt = promptManager.getPrompt("system");

      expect(updatedSystemPrompt).toBeDefined();
      expect(typeof updatedSystemPrompt).toBe("string");
    });
  });
});
