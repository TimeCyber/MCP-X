import { Agent, ActiveAgent } from "../atoms/agentState";

// API响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  fromCache?: boolean;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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

  // 获取智能体列表（支持分页）
  async getAgentListWithPagination(params: PaginationParams): Promise<PaginatedResponse<Agent>> {
    try {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
        ...(params.keyword && { keyword: params.keyword })
      });

      const response = await fetch(`${this.baseUrl}/agent/list?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 适配远程API的数据结构: {total: number, rows: Agent[]}
      if (data.rows && Array.isArray(data.rows)) {
        const total = data.total || data.rows.length;
        const totalPages = Math.ceil(total / params.pageSize);
        
        return {
          data: data.rows,
          total,
          page: params.page,
          pageSize: params.pageSize,
          totalPages,
          hasNextPage: params.page < totalPages,
          hasPreviousPage: params.page > 1
        };
      }
      
      // 如果数据结构不匹配，返回空的分页结果
      console.warn('Unexpected API response structure:', data);
      return {
        data: [],
        total: 0,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };
    } catch (error) {
      console.warn('Agent service not available, returning empty paginated result:', error);
      // 当智能体服务不可用时返回空的分页结果
      return {
        data: [],
        total: 0,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }

  // 获取智能体列表（兼容性方法，不分页）
  async getAgentList(): Promise<Agent[]> {
    try {
      const paginatedResult = await this.getAgentListWithPagination({
        page: 1,
        pageSize: 1000 // 获取足够多的数据来保持兼容性
      });
      
      return paginatedResult.data;
    } catch (error) {
      console.warn('Agent service not available, returning empty list:', error);
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

  // 搜索智能体（支持分页）
  async searchAgentsWithPagination(params: PaginationParams): Promise<PaginatedResponse<Agent>> {
    try {
      // 如果有关键词，使用分页API进行搜索
      if (params.keyword && params.keyword.trim()) {
        return await this.getAgentListWithPagination(params);
      }
      
      // 如果没有关键词，直接获取分页列表
      return await this.getAgentListWithPagination(params);
    } catch (error) {
      console.error(`Failed to search agents with pagination:`, error);
      return {
        data: [],
        total: 0,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }

  // 搜索智能体（兼容性方法，不分页）
  async searchAgents(keyword: string): Promise<Agent[]> {
    try {
      const paginatedResult = await this.searchAgentsWithPagination({
        page: 1,
        pageSize: 1000,
        keyword
      });
      
      return paginatedResult.data;
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
    // 先尝试从详情接口获取完整信息
    try {
      const targetAgent = await this.getAgentDetail(id);
      
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
    } catch (error) {
      throw new Error(`智能体 ID ${id} 不存在或无法加载详情`);
    }
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

  // 更新智能体
  async updateAgent(agent: Agent): Promise<Agent> {
    try {
      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agent),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Update failed with non-JSON response' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const updatedAgent = await response.json();
      return updatedAgent.data || updatedAgent; // 兼容不同返回格式
    } catch (error) {
      console.error(`Failed to update agent ${agent.id}:`, error);
      throw error;
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