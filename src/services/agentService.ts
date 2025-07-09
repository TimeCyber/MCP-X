import { Agent, ActiveAgent } from "../atoms/agentState";

// API响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  fromCache?: boolean;
}

// 智能体搜索结果
interface AgentSearchResponse {
  success: boolean;
  data: Agent[];
  keyword: string;
  total: number;
  message?: string;
}

class AgentService {
  private baseUrl: string;

  constructor() {
    // 使用远程智能体API
    this.baseUrl = 'https://mcp-x.com/prod-api/web/mcp';
  }

  // 获取智能体列表
  async getAgentList(): Promise<Agent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/agent/list`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 适配远程API的数据结构: {total: number, rows: Agent[]}
      if (data.rows && Array.isArray(data.rows)) {
        return data.rows;
      }
      
      // 如果数据结构不匹配，返回空数组
      console.warn('Unexpected API response structure:', data);
      return [];
    } catch (error) {
      console.warn('Agent service not available, returning empty list:', error);
      // 当智能体服务不可用时返回空列表，而不是抛出错误
      return [];
    }
  }

  // 获取智能体详情
  async getAgentDetail(id: number): Promise<Agent> {
    try {
      const response = await fetch(`${this.baseUrl}/agent/detail/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 适配远程API的数据结构: {code: 200, msg: "...", data: Agent}
      if (data.code === 200 && data.data) {
        return data.data;
      }
      
      throw new Error(data.msg || 'Failed to fetch agent detail');
    } catch (error) {
      console.error(`Failed to fetch agent ${id}:`, error);
      throw error;
    }
  }

  // 搜索智能体（使用前端本地搜索）
  async searchAgents(keyword: string): Promise<Agent[]> {
    try {
      // 获取所有智能体，然后在前端进行搜索
      const allAgents = await this.getAgentList();
      
      if (!keyword.trim()) {
        return allAgents;
      }
      
      const lowerKeyword = keyword.toLowerCase();
      return allAgents.filter(agent => 
        agent.name.toLowerCase().includes(lowerKeyword) ||
        agent.description.toLowerCase().includes(lowerKeyword) ||
        (agent.tags && agent.tags.toLowerCase().includes(lowerKeyword)) ||
        (agent.author && agent.author.toLowerCase().includes(lowerKeyword))
      );
    } catch (error) {
      console.error(`Failed to search agents with keyword "${keyword}":`, error);
      return [];
    }
  }

  // 激活智能体（本地状态管理 + 后端同步）
  async activateAgent(id: number): Promise<{ 
    id: number; 
    name: string; 
    activated: boolean; 
    greeting?: string; 
  }> {
    // 从已加载的智能体列表中找到对应的智能体
    const allAgents = await this.getAgentList();
    const targetAgent = allAgents.find(agent => agent.id === id);
    
    if (!targetAgent) {
      throw new Error(`智能体 ID ${id} 不存在`);
    }

    // 将激活状态同步到后端
    try {
      const response = await fetch(`/api/agent/activate/${targetAgent.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.warn('Failed to sync agent to backend, but local state will be maintained');
      }
    } catch (error) {
      console.warn('Backend sync failed, maintaining local state only:', error);
    }

    // 返回本地激活状态，包含智能体的欢迎信息
    return {
      id: targetAgent.id,
      name: targetAgent.name,
      activated: true,
      greeting: targetAgent.openSay || `你好！我是 ${targetAgent.name}，${targetAgent.description}`
    };
  }

  // 获取当前激活的智能体（本地状态管理）
  async getCurrentActiveAgent(): Promise<ActiveAgent | null> {
    // 由于是本地状态管理，这里返回null
    // 实际的激活状态由前端的 activeAgentAtom 管理
    console.info('getCurrentActiveAgent: 由前端状态管理');
    return null;
  }

  // 停用智能体（本地状态管理 + 后端同步）
  async deactivateAgent(): Promise<void> {
    // 将停用状态同步到后端
    try {
      const response = await fetch(`/api/agent/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.warn('Failed to sync deactivation to backend, but local state will be cleared');
      }
    } catch (error) {
      console.warn('Backend deactivation sync failed, clearing local state only:', error);
    }
  }

  // 获取缓存状态（远程API不支持）
  async getCacheStatus(): Promise<{
    isValid: boolean;
    agentCount: number;
    lastFetchTime: number;
    cacheDuration: number;
  }> {
    // 远程API不支持缓存状态查询，返回默认值
    const agentList = await this.getAgentList();
    return {
      isValid: true,
      agentCount: agentList.length,
      lastFetchTime: Date.now(),
      cacheDuration: 0
    };
  }

  // 清除缓存（远程API不支持）
  async clearCache(): Promise<void> {
    // 远程API不支持清除缓存
    console.warn('Cache clearing not supported with remote API');
  }
}

// 导出单例
export const agentService = new AgentService(); 