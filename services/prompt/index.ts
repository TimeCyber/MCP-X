import * as fs from "fs";
import * as path from "path";
import { systemPrompt } from "./system.js";

export class PromptManager {
  private static instance: PromptManager;
  private prompts: Map<string, string>;
  public customRulesPath: string;

  private constructor(customRulesPath?: string) {
    this.prompts = new Map();
    this.customRulesPath = customRulesPath || path.resolve(process.cwd(), ".customrules");

    // Read .customrules file
    try {
      const customRules = fs.readFileSync(this.customRulesPath, "utf-8");
      // Combine system prompt and custom rules
      this.prompts.set("system", systemPrompt(customRules));
    } catch (error) {
      console.warn(`Cannot read ${this.customRulesPath}: ${error}`);
      this.prompts.set("system", systemPrompt(""));
    }
  }

  static getInstance(customRulesPath?: string) {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager(customRulesPath);
    } else if (customRulesPath) {
      PromptManager.instance.customRulesPath = customRulesPath;
    }
    return PromptManager.instance;
  }

  setPrompt(key: string, prompt: string) {
    this.prompts.set(key, prompt);
  }

  getPrompt(key: string): string | undefined {
    return this.prompts.get(key);
  }

  loadCustomRules() {
    const customRulesPath = this.customRulesPath || path.resolve(process.cwd(), ".customrules");
    try {
      const customRules = fs.readFileSync(customRulesPath, "utf-8");
      return customRules;
    } catch (error) {
      console.warn(`Cannot read ${customRulesPath}: ${error}`);
      return "";
    }
  }

  updateSystemPrompt() {
    const customRules = this.loadCustomRules();
    this.prompts.set("system", systemPrompt(customRules));
  }
}
