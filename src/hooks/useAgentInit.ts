import { useEffect, useCallback } from "react";
import { useSetAtom } from "jotai";
import { agentListAtom, activeAgentAtom, agentLoadingStateAtom } from "../atoms/agentState";
import { agentService } from "../services/agentService";

// 智能体初始化Hook
export const useAgentInit = () => {
  const setAgentList = useSetAtom(agentListAtom);
  const setActiveAgent = useSetAtom(activeAgentAtom);
  const setLoadingState = useSetAtom(agentLoadingStateAtom);

  // 初始化智能体状态
  const initializeAgents = useCallback(async () => {
    try {
      // 并行获取智能体列表和当前激活的智能体
      const [agentList, activeAgent] = await Promise.allSettled([
        agentService.getAgentList(),
        agentService.getCurrentActiveAgent(),
      ]);

      // 处理智能体列表
      if (agentList.status === 'fulfilled') {
        setAgentList(agentList.value);
        setLoadingState(prev => ({
          ...prev,
          lastFetchTime: Date.now(),
        }));
      } else {
        console.warn('Failed to load agent list:', agentList.reason);
        // 不阻塞应用启动，设置空列表
        setAgentList([]);
      }

      // 处理激活的智能体
      if (activeAgent.status === 'fulfilled') {
        setActiveAgent(activeAgent.value);
      } else {
        console.warn('Failed to load active agent:', activeAgent.reason);
        // 确保没有激活的智能体状态
        setActiveAgent(null);
      }

    } catch (error) {
      console.error('Failed to initialize agents:', error);
      // 即使失败也要设置初始状态
      setAgentList([]);
      setActiveAgent(null);
    }
  }, [setAgentList, setActiveAgent, setLoadingState]);

  // 静默刷新智能体状态（不显示加载状态）
  const refreshAgentState = useCallback(async () => {
    try {
      const [agentList, activeAgent] = await Promise.allSettled([
        agentService.getAgentList(),
        agentService.getCurrentActiveAgent(),
      ]);

      if (agentList.status === 'fulfilled') {
        setAgentList(agentList.value);
        setLoadingState(prev => ({
          ...prev,
          lastFetchTime: Date.now(),
        }));
      }

      if (activeAgent.status === 'fulfilled') {
        setActiveAgent(activeAgent.value);
      }
    } catch (error) {
      // 静默处理错误，不影响用户体验
      console.warn('Failed to refresh agent state:', error);
    }
  }, [setAgentList, setActiveAgent, setLoadingState]);

  return {
    initializeAgents,
    refreshAgentState,
  };
};

// 智能体自动初始化Hook，集成到App组件中使用
export const useAgentAutoInit = () => {
  const { initializeAgents } = useAgentInit();

  useEffect(() => {
    // 延迟初始化，确保应用其他部分已经加载完成
    const timer = setTimeout(() => {
      initializeAgents().catch(error => {
        console.error('Agent auto-initialization failed:', error);
      });
    }, 1000); // 1秒后初始化

    return () => clearTimeout(timer);
  }, [initializeAgents]);
}; 