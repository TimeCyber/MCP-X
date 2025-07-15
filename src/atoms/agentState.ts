import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// 智能体基础类型定义
export interface Agent {
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

// 当前激活的智能体信息
export interface ActiveAgent {
  id: number;
  name: string;
  avatar: string;
  description: string;
  isActive: boolean;
  greeting?: string;
}

// 智能体配置状态
export interface AgentConfig {
  selectedAgentId: number | null;
  autoActivateOnSelect: boolean;
  showGreetingOnActivation: boolean;
  cacheExpiration: number;
}

// 分页信息
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// 智能体加载状态
export interface AgentLoadingState {
  isFetchingList: boolean;
  isFetchingDetail: boolean;
  isActivating: boolean;
  isDeactivating: boolean;
  isLoadingMore: boolean; // 加载更多数据
  isInitialized: boolean; // 是否已经初始化过数据
  error: string | null;
  lastFetchTime: number | null;
}

// 原子定义
// 智能体列表
export const agentListAtom = atom<Agent[]>([]);

// 分页信息
export const agentPaginationAtom = atom<PaginationInfo>({
  currentPage: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
});

// 当前激活的智能体
export const activeAgentAtom = atom<ActiveAgent | null>(null);

// 智能体配置（持久化到localStorage）
export const agentConfigAtom = atomWithStorage<AgentConfig>("mcpx-agent-config", {
  selectedAgentId: null,
  autoActivateOnSelect: true,
  showGreetingOnActivation: true,
  cacheExpiration: 5 * 60 * 1000, // 5分钟
});

// 加载状态
export const agentLoadingStateAtom = atom<AgentLoadingState>({
  isFetchingList: false,
  isFetchingDetail: false,
  isActivating: false,
  isDeactivating: false,
  isLoadingMore: false,
  isInitialized: false,
  error: null,
  lastFetchTime: null,
});

// 智能体搜索关键词
export const agentSearchKeywordAtom = atom<string>("");

// 是否启用分页模式
export const agentPaginationModeAtom = atomWithStorage<boolean>("mcpx-agent-pagination-mode", true);

// 过滤后的智能体列表（根据搜索关键词）
export const filteredAgentListAtom = atom((get) => {
  const agents = get(agentListAtom);
  const keyword = get(agentSearchKeywordAtom);
  const paginationMode = get(agentPaginationModeAtom);
  
  // 如果启用分页模式，直接返回当前列表（搜索通过API完成）
  if (paginationMode) {
    return agents;
  }
  
  // 如果是非分页模式，使用前端过滤
  if (!keyword.trim()) {
    return agents;
  }
  
  const lowerKeyword = keyword.toLowerCase();
  return agents.filter(agent => 
    agent.name.toLowerCase().includes(lowerKeyword) ||
    agent.description.toLowerCase().includes(lowerKeyword) ||
    agent.tags.toLowerCase().includes(lowerKeyword) ||
    agent.author.toLowerCase().includes(lowerKeyword)
  );
});

// 当前选中的智能体详情
export const selectedAgentAtom = atom<Agent | null>((get) => {
  const agents = get(agentListAtom);
  const usedAgents = get(usedAgentsAtom);
  const config = get(agentConfigAtom);
  
  if (!config.selectedAgentId) {
    return null;
  }
  
  // 首先尝试从主列表中查找
  const agentFromList = agents.find(agent => agent.id === config.selectedAgentId);
  if (agentFromList) {
    return agentFromList;
  }
  
  // 如果主列表中没有，尝试从已使用的智能体列表中查找
  const usedAgent = usedAgents.find(agent => agent.id === config.selectedAgentId);
  if (usedAgent) {
    // 将 UsedAgent 转换为 Agent 格式
    return {
      id: usedAgent.id,
      name: usedAgent.name,
      avatar: usedAgent.avatar,
      description: usedAgent.description,
      systemRole: '', // 这些字段在 UsedAgent 中不存在，设为默认值
      systemPromote: '',
      openSay: '',
      questions: '',
      author: '',
      tags: '',
      usageCount: 0,
      likeCount: 0,
      starCount: 0,
      viewCount: 0,
    };
  }
  
  return null;
});

// 是否有缓存的智能体数据
export const hasCachedAgentsAtom = atom((get) => {
  const agents = get(agentListAtom);
  const loadingState = get(agentLoadingStateAtom);
  const config = get(agentConfigAtom);
  
  if (agents.length === 0) return false;
  if (!loadingState.lastFetchTime) return false;
  
  const now = Date.now();
  const isExpired = (now - loadingState.lastFetchTime) > config.cacheExpiration;
  
  return !isExpired;
});

// 智能体统计信息
export const agentStatsAtom = atom((get) => {
  const agents = get(agentListAtom);
  const activeAgent = get(activeAgentAtom);
  const pagination = get(agentPaginationAtom);
  
  return {
    totalAgents: pagination.total || agents.length,
    currentPageAgents: agents.length,
    hasActiveAgent: !!activeAgent,
    activeAgentName: activeAgent?.name || null,
  };
}); 

// 已使用过的智能体记录
export interface UsedAgent {
  id: number;
  name: string;
  avatar: string;
  description: string;
  lastUsedAt: string;
  usageCount: number;
}

// 本地存储的已使用智能体列表
export const usedAgentsAtom = atomWithStorage<UsedAgent[]>('mcpx-used-agents', []);

// 计算的已使用智能体列表（按最后使用时间排序）
export const sortedUsedAgentsAtom = atom((get) => {
  const usedAgents = get(usedAgentsAtom);
  return usedAgents.sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
});

// 检查某个智能体是否已被使用过
export const isAgentUsedAtom = atom((get) => (agentId: number) => {
  const usedAgents = get(usedAgentsAtom);
  return usedAgents.some(agent => agent.id === agentId);
});

// 添加或更新已使用智能体的原子操作
export const addUsedAgentAtom = atom(
  null,
  (get, set, agent: Agent) => {
    const usedAgents = get(usedAgentsAtom);
    const existingIndex = usedAgents.findIndex(used => used.id === agent.id);
    
    const usedAgent: UsedAgent = {
      id: agent.id,
      name: agent.name,
      avatar: agent.avatar,
      description: agent.description,
      lastUsedAt: new Date().toISOString(),
      usageCount: existingIndex >= 0 ? usedAgents[existingIndex].usageCount + 1 : 1
    };
    
    if (existingIndex >= 0) {
      // 更新已存在的记录
      const newUsedAgents = [...usedAgents];
      newUsedAgents[existingIndex] = usedAgent;
      set(usedAgentsAtom, newUsedAgents);
    } else {
      // 添加新记录
      set(usedAgentsAtom, [...usedAgents, usedAgent]);
    }
  }
);

// 删除已使用智能体的原子操作
export const removeUsedAgentAtom = atom(
  null,
  (get, set, agentId: number) => {
    const usedAgents = get(usedAgentsAtom);
    const filteredAgents = usedAgents.filter(agent => agent.id !== agentId);
    set(usedAgentsAtom, filteredAgents);
  }
);

// 清空所有已使用智能体的原子操作
export const clearUsedAgentsAtom = atom(
  null,
  (get, set) => {
    set(usedAgentsAtom, []);
  }
);