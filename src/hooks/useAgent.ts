import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import {
  agentListAtom,
  activeAgentAtom,
  agentConfigAtom,
  agentLoadingStateAtom,
  agentSearchKeywordAtom,
  filteredAgentListAtom,
  selectedAgentAtom,
  hasCachedAgentsAtom,
  agentStatsAtom,
  Agent,
  ActiveAgent,
  AgentConfig,
} from "../atoms/agentState";
import { agentService } from "../services/agentService";

// 智能体操作Hook
export const useAgent = () => {
  const [agentList, setAgentList] = useAtom(agentListAtom);
  const [activeAgent, setActiveAgent] = useAtom(activeAgentAtom);
  const [agentConfig, setAgentConfig] = useAtom(agentConfigAtom);
  const [loadingState, setLoadingState] = useAtom(agentLoadingStateAtom);
  const [searchKeyword, setSearchKeyword] = useAtom(agentSearchKeywordAtom);
  
  const filteredAgents = useAtomValue(filteredAgentListAtom);
  const selectedAgent = useAtomValue(selectedAgentAtom);
  const hasCachedAgents = useAtomValue(hasCachedAgentsAtom);
  const agentStats = useAtomValue(agentStatsAtom);

  // 更新加载状态的辅助函数
  const updateLoadingState = useCallback((updates: Partial<typeof loadingState>) => {
    setLoadingState(prev => ({ ...prev, ...updates }));
  }, [setLoadingState]);

  // 获取智能体列表
  const fetchAgentList = useCallback(async (force = false) => {
    // 如果有缓存且不强制刷新，则跳过
    if (!force && hasCachedAgents && agentList.length > 0) {
      return agentList;
    }

    updateLoadingState({ isFetchingList: true, error: null });
    
    try {
      const agents = await agentService.getAgentList();
      setAgentList(agents);
      updateLoadingState({ 
        isFetchingList: false, 
        lastFetchTime: Date.now() 
      });
      return agents;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateLoadingState({ 
        isFetchingList: false, 
        error: errorMessage 
      });
      throw error;
    }
  }, [agentList, hasCachedAgents, setAgentList, updateLoadingState]);

  // 搜索智能体
  const searchAgents = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchKeyword("");
      return agentList;
    }

    setSearchKeyword(keyword);
    
    // 如果本地有数据，直接使用本地过滤
    if (agentList.length > 0) {
      return filteredAgents;
    }

    // 否则调用API搜索
    updateLoadingState({ isFetchingList: true, error: null });
    
    try {
      const agents = await agentService.searchAgents(keyword);
      setAgentList(agents);
      updateLoadingState({ 
        isFetchingList: false, 
        lastFetchTime: Date.now() 
      });
      return agents;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateLoadingState({ 
        isFetchingList: false, 
        error: errorMessage 
      });
      throw error;
    }
  }, [agentList, filteredAgents, setSearchKeyword, setAgentList, updateLoadingState]);

  // 选择智能体
  const selectAgent = useCallback((agentId: number | null) => {
    setAgentConfig(prev => ({
      ...prev,
      selectedAgentId: agentId,
    }));
  }, [setAgentConfig]);

  // 激活智能体
  const activateAgent = useCallback(async (agentId: number) => {
    updateLoadingState({ isActivating: true, error: null });
    
    try {
      const result = await agentService.activateAgent(agentId);
      
      // 更新激活状态
      const newActiveAgent: ActiveAgent = {
        id: result.id,
        name: result.name,
        avatar: "", // 需要从列表中获取
        description: "", // 需要从列表中获取
        isActive: true,
        greeting: result.greeting,
      };

      // 尝试从本地列表获取完整信息
      const fullAgent = agentList.find(agent => agent.id === result.id);
      if (fullAgent) {
        newActiveAgent.avatar = fullAgent.avatar;
        newActiveAgent.description = fullAgent.description;
      }

      setActiveAgent(newActiveAgent);
      
      // 如果配置了自动选择，更新选中状态
      if (agentConfig.autoActivateOnSelect) {
        selectAgent(agentId);
      }

      updateLoadingState({ isActivating: false });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateLoadingState({ 
        isActivating: false, 
        error: errorMessage 
      });
      throw error;
    }
  }, [agentList, agentConfig.autoActivateOnSelect, selectAgent, setActiveAgent, updateLoadingState]);

  // 停用智能体
  const deactivateAgent = useCallback(async () => {
    updateLoadingState({ isDeactivating: true, error: null });
    
    try {
      await agentService.deactivateAgent();
      setActiveAgent(null);
      updateLoadingState({ isDeactivating: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateLoadingState({ 
        isDeactivating: false, 
        error: errorMessage 
      });
      throw error;
    }
  }, [setActiveAgent, updateLoadingState]);

  // 获取当前激活的智能体
  const refreshActiveAgent = useCallback(async () => {
    try {
      const currentAgent = await agentService.getCurrentActiveAgent();
      setActiveAgent(currentAgent);
      return currentAgent;
    } catch (error) {
      console.error('Failed to refresh active agent:', error);
      setActiveAgent(null);
      return null;
    }
  }, [setActiveAgent]);

  // 更新智能体配置
  const updateAgentConfig = useCallback((updates: Partial<AgentConfig>) => {
    setAgentConfig(prev => ({ ...prev, ...updates }));
  }, [setAgentConfig]);

  // 清除错误状态
  const clearError = useCallback(() => {
    updateLoadingState({ error: null });
  }, [updateLoadingState]);

  // 重置搜索
  const clearSearch = useCallback(() => {
    setSearchKeyword("");
  }, [setSearchKeyword]);

  // 清除缓存并刷新
  const clearCacheAndRefresh = useCallback(async () => {
    try {
      await agentService.clearCache();
      await fetchAgentList(true);
    } catch (error) {
      console.error('Failed to clear cache and refresh:', error);
      throw error;
    }
  }, [fetchAgentList]);

  return {
    // 状态
    agentList,
    filteredAgents,
    activeAgent,
    selectedAgent,
    agentConfig,
    loadingState,
    searchKeyword,
    hasCachedAgents,
    agentStats,
    
    // 操作
    fetchAgentList,
    searchAgents,
    selectAgent,
    activateAgent,
    deactivateAgent,
    refreshActiveAgent,
    updateAgentConfig,
    clearError,
    clearSearch,
    clearCacheAndRefresh,
  };
};

// 简化版Hook，仅用于状态读取
export const useAgentState = () => {
  const agentList = useAtomValue(agentListAtom);
  const activeAgent = useAtomValue(activeAgentAtom);
  const selectedAgent = useAtomValue(selectedAgentAtom);
  const agentStats = useAtomValue(agentStatsAtom);
  const loadingState = useAtomValue(agentLoadingStateAtom);

  return {
    agentList,
    activeAgent,
    selectedAgent,
    agentStats,
    loadingState,
  };
}; 