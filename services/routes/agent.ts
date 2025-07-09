import express from "express";
import logger from "../utils/logger.js";
import { PromptManager } from "../prompt/index.js";

interface Agent {
  id: number;
  name: string;
  avatar: string;
  description: string;
  systemRole: string;
  systemPromote: string;
  openSay: string;
  questions: string;
  author: string;
  tags: string;
  usageCount: number;
  likeCount: number;
  starCount: number;
  viewCount: number;
}

interface AgentListApiResponse {
  code: number;
  msg: string;
  total: number;
  rows: Agent[];
}

interface AgentDetailApiResponse {
  code: number;
  msg: string;
  data: Agent;
}

class AgentCache {
  private static instance: AgentCache;
  private agentList: Agent[] = [];
  private agentDetails: Map<number, Agent> = new Map();
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  static getInstance(): AgentCache {
    if (!AgentCache.instance) {
      AgentCache.instance = new AgentCache();
    }
    return AgentCache.instance;
  }

  isCacheValid(): boolean {
    return Date.now() - this.lastFetchTime < this.CACHE_DURATION;
  }

  setAgentList(agents: Agent[]): void {
    this.agentList = agents;
    this.lastFetchTime = Date.now();
    // 同时缓存到详情map中
    agents.forEach(agent => {
      this.agentDetails.set(agent.id, agent);
    });
  }

  getAgentList(): Agent[] {
    return this.agentList;
  }

  setAgentDetail(id: number, agent: Agent): void {
    this.agentDetails.set(id, agent);
  }

  getAgentDetail(id: number): Agent | undefined {
    return this.agentDetails.get(id);
  }

  clearCache(): void {
    this.agentList = [];
    this.agentDetails.clear();
    this.lastFetchTime = 0;
  }
}

export function agentRouter() {
  const router = express.Router();
  const cache = AgentCache.getInstance();

  // 获取智能体列表
  router.get("/list", async (req, res) => {
    try {
      // 检查缓存
      if (cache.isCacheValid() && cache.getAgentList().length > 0) {
        logger.debug("Agent list served from cache");
        res.json({
          success: true,
          data: cache.getAgentList(),
          fromCache: true
        });
        return;
      }

      // 从远程API获取
      const response = await fetch("https://mcp-x.com/prod-api/web/mcp/agent/list");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiData: AgentListApiResponse = await response.json();
      
      if (apiData.code !== 200) {
        throw new Error(`API error: ${apiData.msg}`);
      }

      const agents = apiData.rows || [];
      
      // 缓存结果
      cache.setAgentList(agents);
      
      logger.info(`Fetched ${agents.length} agents from remote API`);
      
      res.json({
        success: true,
        data: agents,
        fromCache: false
      });
    } catch (error: any) {
      logger.error(`Failed to fetch agent list: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `Failed to fetch agent list: ${error.message}`
      });
    }
  });

  // 获取指定智能体详情
  router.get("/:id", async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      
      if (isNaN(agentId)) {
        res.status(400).json({
          success: false,
          message: "Invalid agent ID"
        });
        return;
      }

      // 检查缓存
      const cachedAgent = cache.getAgentDetail(agentId);
      if (cachedAgent) {
        logger.debug(`Agent ${agentId} served from cache`);
        res.json({
          success: true,
          data: cachedAgent,
          fromCache: true
        });
        return;
      }

      // 从远程API获取
      const response = await fetch(`https://mcp-x.com/prod-api/web/mcp/agent/detail/${agentId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiData: AgentDetailApiResponse = await response.json();
      
      if (apiData.code !== 200) {
        throw new Error(`API error: ${apiData.msg}`);
      }

      const agent = apiData.data;
      
      // 缓存结果
      cache.setAgentDetail(agentId, agent);
      
      logger.info(`Fetched agent ${agentId} from remote API`);
      
      res.json({
        success: true,
        data: agent,
        fromCache: false
      });
    } catch (error: any) {
      logger.error(`Failed to fetch agent ${req.params.id}: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `Failed to fetch agent details: ${error.message}`
      });
    }
  });

  // 清除缓存
  router.delete("/cache", (req, res) => {
    try {
      cache.clearCache();
      logger.info("Agent cache cleared");
      res.json({
        success: true,
        message: "Cache cleared successfully"
      });
    } catch (error: any) {
      logger.error(`Failed to clear cache: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `Failed to clear cache: ${error.message}`
      });
    }
  });

  // 搜索智能体（基于本地缓存）
  router.get("/search/:keyword", async (req, res) => {
    try {
      const keyword = req.params.keyword.toLowerCase();
      
      // 如果缓存为空，先获取列表
      if (!cache.isCacheValid() || cache.getAgentList().length === 0) {
        try {
          const response = await fetch("https://mcp-x.com/prod-api/web/mcp/agent/list");
          const apiData: AgentListApiResponse = await response.json();
          
          if (apiData.code === 200) {
            const agents = apiData.rows || [];
            cache.setAgentList(agents);
          } else {
            throw new Error(apiData.msg);
          }
        } catch (fetchError: any) {
          logger.error(`Failed to fetch agents for search: ${fetchError.message}`);
          res.status(500).json({
            success: false,
            message: `Failed to fetch agents: ${fetchError.message}`
          });
          return;
        }
      }

      const allAgents = cache.getAgentList();
      
      // 在名称、描述、标签中搜索
      const filteredAgents = allAgents.filter(agent => 
        agent.name.toLowerCase().includes(keyword) ||
        agent.description.toLowerCase().includes(keyword) ||
        agent.tags.toLowerCase().includes(keyword) ||
        agent.author.toLowerCase().includes(keyword)
      );
      
      logger.info(`Search for '${keyword}' returned ${filteredAgents.length} results`);
      
      res.json({
        success: true,
        data: filteredAgents,
        keyword: req.params.keyword,
        total: filteredAgents.length
      });
    } catch (error: any) {
      logger.error(`Failed to search agents: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `Failed to search agents: ${error.message}`
      });
    }
  });

  // 获取缓存状态
  router.get("/cache/status", (req, res) => {
    const agentList = cache.getAgentList();
    res.json({
      success: true,
      data: {
        isValid: cache.isCacheValid(),
        agentCount: agentList.length,
        lastFetchTime: (cache as any).lastFetchTime,
        cacheDuration: (cache as any).CACHE_DURATION
      }
    });
  });

  // 激活智能体
  router.post("/activate/:id", async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      
      if (isNaN(agentId)) {
        res.status(400).json({
          success: false,
          message: "Invalid agent ID"
        });
        return;
      }

      // 获取智能体详情
      let agent = cache.getAgentDetail(agentId);
      
      if (!agent) {
        // 从远程API获取
        const response = await fetch(`https://mcp-x.com/prod-api/web/mcp/agent/detail/${agentId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiData: AgentDetailApiResponse = await response.json();
        
        if (apiData.code !== 200) {
          throw new Error(`API error: ${apiData.msg}`);
        }

        agent = apiData.data;
        cache.setAgentDetail(agentId, agent);
      }

      // 激活智能体到 PromptManager
      const promptManager = PromptManager.getInstance();
      promptManager.setAgent({
        name: agent.name,
        systemRole: agent.systemRole,
        systemPromote: agent.systemPromote,
        openSay: agent.openSay
      });
      
      // 强制刷新智能体同步缓存
      promptManager.forceAgentSync();
      
      logger.info(`Agent ${agentId} (${agent.name}) activated successfully`);
      
      res.json({
        success: true,
        data: {
          id: agentId,
          name: agent.name,
          activated: true,
          greeting: agent.openSay
        },
        message: `Agent '${agent.name}' activated successfully`
      });
    } catch (error: any) {
      logger.error(`Failed to activate agent ${req.params.id}: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `Failed to activate agent: ${error.message}`
      });
    }
  });

  // 获取当前激活的智能体
  router.get("/current/active", (req, res) => {
    try {
      const promptManager = PromptManager.getInstance();
      const currentAgent = promptManager.getCurrentAgent();
      
      if (currentAgent) {
        res.json({
          success: true,
          activeAgent: {
            name: currentAgent.name,
            systemRole: currentAgent.systemRole,
            systemPromote: currentAgent.systemPromote,
            openSay: currentAgent.openSay,
            isActive: true
          }
        });
      } else {
        res.json({
          success: true,
          activeAgent: null,
          message: "No agent currently active"
        });
      }
    } catch (error: any) {
      logger.error(`Failed to get current agent: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `Failed to get current agent: ${error.message}`
      });
    }
  });

  // 停用智能体
  router.post("/deactivate", (req, res) => {
    try {
      const promptManager = PromptManager.getInstance();
      promptManager.clearAgent();
      
      // 强制刷新智能体同步缓存
      promptManager.forceAgentSync();
      
      logger.info("Agent deactivated successfully");
      
      res.json({
        success: true,
        message: "Agent deactivated successfully"
      });
    } catch (error: any) {
      logger.error(`Failed to deactivate agent: ${error.message}`);
      res.status(500).json({
        success: false,
        message: `Failed to deactivate agent: ${error.message}`
      });
    }
  });

  return router;
} 