import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import {
  agentListAtom,
  agentPaginationAtom,
  activeAgentAtom,
  agentConfigAtom,
  agentLoadingStateAtom,
  agentSearchKeywordAtom,
  agentPaginationModeAtom,
  filteredAgentListAtom,
  selectedAgentAtom,
  hasCachedAgentsAtom,
  agentStatsAtom,
  Agent,
  ActiveAgent,
  AgentConfig,
  PaginationInfo,
} from "../atoms/agentState";
import { agentService, PaginationParams } from "../services/agentService";

// 智能体操作Hook
export const useAgent = () => {
  const [agentList, setAgentList] = useAtom(agentListAtom);
  const [pagination, setPagination] = useAtom(agentPaginationAtom);
  const [activeAgent, setActiveAgent] = useAtom(activeAgentAtom);
  const [agentConfig, setAgentConfig] = useAtom(agentConfigAtom);
  const [loadingState, setLoadingState] = useAtom(agentLoadingStateAtom);
  const [searchKeyword, setSearchKeyword] = useAtom(agentSearchKeywordAtom);
  const [paginationMode, setPaginationMode] = useAtom(agentPaginationModeAtom);
  
  const filteredAgents = useAtomValue(filteredAgentListAtom);
  const selectedAgent = useAtomValue(selectedAgentAtom);
  const hasCachedAgents = useAtomValue(hasCachedAgentsAtom);
  const agentStats = useAtomValue(agentStatsAtom);

  // 更新加载状态的辅助函数
  const updateLoadingState = useCallback((updates: Partial<typeof loadingState>) => {
    setLoadingState(prev => ({ ...prev, ...updates }));
  }, [setLoadingState]);

  // 更新分页信息的辅助函数
  const updatePagination = useCallback((newPagination: Partial<PaginationInfo>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, [setPagination]);

  // 获取分页智能体列表
  const fetchAgentListWithPagination = useCallback(async (params?: Partial<PaginationParams>, append = false) => {
    const currentParams: PaginationParams = {
      page: params?.page || pagination.currentPage,
      pageSize: params?.pageSize || pagination.pageSize,
      keyword: params?.keyword !== undefined ? params.keyword : searchKeyword,
    };

    updateLoadingState({ 
      isFetchingList: !append, 
      isLoadingMore: append,
      error: null 
    });
    
    try {
      const result = await agentService.getAgentListWithPagination(currentParams);
      
      // 更新智能体列表
      if (append) {
        setAgentList(prev => [...prev, ...result.data]);
      } else {
        setAgentList(result.data);
      }
      
      // 更新分页信息
      updatePagination({
        currentPage: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
      });
      
      updateLoadingState({ 
        isFetchingList: false,
        isLoadingMore: false,
        isInitialized: true, // 标记为已初始化
        lastFetchTime: Date.now() 
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateLoadingState({ 
        isFetchingList: false,
        isLoadingMore: false,
        error: errorMessage 
      });
      throw error;
    }
  }, [pagination, searchKeyword, setAgentList, updateLoadingState, updatePagination]);

  // 获取智能体列表（兼容性方法）
  const fetchAgentList = useCallback(async (force = false) => {
    if (paginationMode) {
      // 分页模式：获取第一页数据
      const result = await fetchAgentListWithPagination({ page: 1 });
      // 标记为已初始化
      updateLoadingState({ isInitialized: true });
      return result;
    } else {
      // 非分页模式：使用原有逻辑
      if (!force && hasCachedAgents && agentList.length > 0) {
        return agentList;
      }

      updateLoadingState({ isFetchingList: true, error: null });
      
      try {
        const agents = await agentService.getAgentList();
        setAgentList(agents);
        updateLoadingState({ 
          isFetchingList: false, 
          isInitialized: true, // 标记为已初始化
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
    }
  }, [paginationMode, fetchAgentListWithPagination, setAgentList, updateLoadingState]); // 减少依赖项，只保留必要的

  // 搜索智能体
  const searchAgents = useCallback(async (keyword: string) => {
    setSearchKeyword(keyword);
    
    if (keyword && keyword.trim()) {
      // 有关键词时使用搜索接口
      try {
        updateLoadingState({ isFetchingList: true, error: null });
        
        const agents = await agentService.searchAgents(keyword);
        setAgentList(agents);
        
        updateLoadingState({ 
          isFetchingList: false, 
          isInitialized: true,
          lastFetchTime: Date.now() 
        });
        
        console.log(`🔍 搜索完成: "${keyword}", 找到 ${agents.length} 个结果`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateLoadingState({ 
          isFetchingList: false, 
          error: errorMessage 
        });
        console.error('Failed to search agents:', error);
      }
    } else {
      // 没有关键词时恢复原始列表
      if (paginationMode) {
        // 分页模式：重新加载第一页
        try {
          await fetchAgentListWithPagination({ page: 1 });
        } catch (error) {
          console.error('Failed to reload agents after clearing search:', error);
        }
      } else {
        // 非分页模式：重新加载全部数据
        try {
          await fetchAgentList(true);
        } catch (error) {
          console.error('Failed to reload agents after clearing search:', error);
        }
      }
    }
  }, [paginationMode, setSearchKeyword, setAgentList, updateLoadingState, fetchAgentListWithPagination, fetchAgentList]);

  // 跳转到指定页面
  const goToPage = useCallback(async (page: number) => {
    if (!paginationMode || page < 1 || page > pagination.totalPages) return;
    
    try {
      await fetchAgentListWithPagination({ page });
    } catch (error) {
      console.error('Failed to go to page:', page, error);
    }
  }, [paginationMode, pagination.totalPages, fetchAgentListWithPagination]);

  // 加载下一页（追加模式）
  const loadMoreAgents = useCallback(async () => {
    if (!paginationMode || !pagination.hasNextPage || loadingState.isLoadingMore) return;
    
    try {
      await fetchAgentListWithPagination({ page: pagination.currentPage + 1 }, true);
    } catch (error) {
      console.error('Failed to load more agents:', error);
    }
  }, [paginationMode, pagination.hasNextPage, pagination.currentPage, loadingState.isLoadingMore, fetchAgentListWithPagination]);

  // 刷新当前页
  const refreshCurrentPage = useCallback(async () => {
    if (!paginationMode) {
      return await fetchAgentList(true);
    }
    
    try {
      await fetchAgentListWithPagination({ page: pagination.currentPage });
    } catch (error) {
      console.error('Failed to refresh current page:', error);
    }
  }, [paginationMode, pagination.currentPage, fetchAgentList, fetchAgentListWithPagination]);

  // 设置分页大小
  const setPageSize = useCallback(async (pageSize: number) => {
    if (!paginationMode || pageSize < 1) return;
    
    updatePagination({ pageSize });
    
    try {
      await fetchAgentListWithPagination({ page: 1, pageSize });
    } catch (error) {
      console.error('Failed to update page size:', error);
    }
  }, [paginationMode, updatePagination, fetchAgentListWithPagination]);

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

  // 切换分页模式
  const togglePaginationMode = useCallback(async () => {
    const newMode = !paginationMode;
    setPaginationMode(newMode);
    
    // 重置初始化状态，确保切换模式后重新加载数据
    updateLoadingState({ isInitialized: false });
    
    // 切换模式后重新加载数据
    try {
      if (newMode) {
        // 切换到分页模式
        await fetchAgentListWithPagination({ page: 1 });
      } else {
        // 切换到非分页模式
        await fetchAgentList(true);
      }
    } catch (error) {
      console.error('Failed to reload data after mode switch:', error);
    }
  }, [paginationMode, setPaginationMode, fetchAgentListWithPagination, fetchAgentList, updateLoadingState]);

  // 清除错误状态
  const clearError = useCallback(() => {
    updateLoadingState({ error: null });
  }, [updateLoadingState]);

  // 重置搜索
  const clearSearch = useCallback(async () => {
    setSearchKeyword("");
    
    if (paginationMode) {
      // 分页模式：重新加载第一页数据（不带搜索关键词）
      try {
        await fetchAgentListWithPagination({ page: 1 });
      } catch (error) {
        console.error('Failed to clear search:', error);
      }
    } else {
      // 非分页模式：重新加载全部数据
      try {
        await fetchAgentList(true);
      } catch (error) {
        console.error('Failed to reload agents after clearing search:', error);
      }
    }
  }, [paginationMode, setSearchKeyword, fetchAgentListWithPagination, fetchAgentList]);

  // 清除缓存并刷新
  const clearCacheAndRefresh = useCallback(async () => {
    try {
      await agentService.clearCache();
      // 重置初始化状态，确保重新加载数据
      updateLoadingState({ isInitialized: false });
      
      if (paginationMode) {
        await fetchAgentListWithPagination({ page: 1 });
      } else {
        await fetchAgentList(true);
      }
    } catch (error) {
      console.error('Failed to clear cache and refresh:', error);
      throw error;
    }
  }, [paginationMode, fetchAgentListWithPagination, fetchAgentList, updateLoadingState]);

  const updateAgent = useCallback(async (agentToUpdate: Partial<Agent> & { id: number }) => {
    updateLoadingState({ isFetchingDetail: true, error: null });
    try {
      const updatedAgent = await agentService.updateAgent(agentToUpdate as Agent);
      setAgentList(prev => 
        prev.map(agent => (agent.id === updatedAgent.id ? updatedAgent : agent))
      );
      updateLoadingState({ isFetchingDetail: false });
      return updatedAgent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateLoadingState({ 
        isFetchingDetail: false, 
        error: errorMessage 
      });
      throw error;
    }
  }, [setAgentList, updateLoadingState]);

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
    pagination,
    paginationMode,
    
    // 操作
    fetchAgentList,
    fetchAgentListWithPagination,
    searchAgents,
    selectAgent,
    activateAgent,
    deactivateAgent,
    refreshActiveAgent,
    updateAgentConfig,
    clearError,
    clearSearch,
    clearCacheAndRefresh,
    updateAgent,
    
    // 分页操作
    goToPage,
    loadMoreAgents,
    refreshCurrentPage,
    setPageSize,
    togglePaginationMode,
  };
};

// 简化版Hook，仅用于状态读取
export const useAgentState = () => {
  const agentList = useAtomValue(agentListAtom);
  const activeAgent = useAtomValue(activeAgentAtom);
  const selectedAgent = useAtomValue(selectedAgentAtom);
  const agentStats = useAtomValue(agentStatsAtom);
  const loadingState = useAtomValue(agentLoadingStateAtom);
  const pagination = useAtomValue(agentPaginationAtom);
  const paginationMode = useAtomValue(agentPaginationModeAtom);

  return {
    agentList,
    activeAgent,
    selectedAgent,
    agentStats,
    loadingState,
    pagination,
    paginationMode,
  };
};

export const useAgentUpdater = () => {
  const { updateAgent } = useAgent();
  return { updateAgent };
}; 