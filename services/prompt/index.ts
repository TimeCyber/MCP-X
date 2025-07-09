import * as fs from "fs";
import * as path from "path";
import { systemPrompt } from "./system.js";

interface AgentRole {
  name?: string;
  systemRole?: string;
  systemPromote?: string;
  openSay?: string;
}

export class PromptManager {
  private static instance: PromptManager;
  private prompts: Map<string, string>;
  public customRulesPath: string;
  private currentAgent: AgentRole | null = null;
  private lastAgentSync: number = 0;
  private agentSyncInterval: number = 30000; // 30秒缓存时间

  private constructor(customRulesPath?: string) {
    this.prompts = new Map();
    this.customRulesPath = customRulesPath || path.resolve(process.cwd(), ".customrules");

    // Read .customrules file and initialize system prompt
    this.updateSystemPrompt();
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
    this.prompts.set("system", systemPrompt(customRules, this.currentAgent || undefined));
  }

  // 智能体管理方法
  setAgent(agent: AgentRole | null) {
    this.currentAgent = agent;
    this.updateSystemPrompt(); // 重新生成系统提示词
  }

  getCurrentAgent(): AgentRole | null {
    return this.currentAgent;
  }

  clearAgent() {
    this.currentAgent = null;
    this.updateSystemPrompt(); // 恢复默认系统提示词
  }

  // 获取智能体开场白
  getAgentGreeting(): string | null {
    return this.currentAgent?.openSay || null;
  }

  // 检查是否有活跃的智能体
  hasActiveAgent(): boolean {
    return this.currentAgent !== null;
  }

  // 检查是否需要同步智能体状态
  needsAgentSync(): boolean {
    const now = Date.now();
    return (now - this.lastAgentSync) > this.agentSyncInterval;
  }

  // 标记智能体同步完成
  markAgentSynced(): void {
    this.lastAgentSync = Date.now();
  }

  // 强制刷新智能体状态（用于智能体激活/停用时）
  forceAgentSync(): void {
    this.lastAgentSync = 0;
  }
}
