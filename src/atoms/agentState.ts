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

// 智能体加载状态
export interface AgentLoadingState {
  isFetchingList: boolean;
  isFetchingDetail: boolean;
  isActivating: boolean;
  isDeactivating: boolean;
  error: string | null;
  lastFetchTime: number | null;
}

// 原子定义
// 智能体列表
export const agentListAtom = atom<Agent[]>([]);

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
  error: null,
  lastFetchTime: null,
});

// 智能体搜索关键词
export const agentSearchKeywordAtom = atom<string>("");

// 过滤后的智能体列表（根据搜索关键词）
export const filteredAgentListAtom = atom((get) => {
  const agents = get(agentListAtom);
  const keyword = get(agentSearchKeywordAtom);
  
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
  const config = get(agentConfigAtom);
  
  if (!config.selectedAgentId) {
    return null;
  }
  
  return agents.find(agent => agent.id === config.selectedAgentId) || null;
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
  
  return {
    totalAgents: agents.length,
    hasActiveAgent: !!activeAgent,
    activeAgentName: activeAgent?.name || null,
  };
}); 