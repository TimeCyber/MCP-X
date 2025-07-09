import React, { useState, useRef, useEffect } from "react";
import { useAgent } from "../hooks/useAgent";
import { Agent } from "../atoms/agentState";
import { useTranslation } from "react-i18next";

interface AgentSelectProps {
  className?: string;
}

const AgentSelect: React.FC<AgentSelectProps> = ({ className = "" }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    filteredAgents,
    activeAgent,
    selectedAgent,
    loadingState,
    searchKeyword,
    fetchAgentList,
    searchAgents,
    selectAgent,
    activateAgent,
    deactivateAgent,
    clearSearch,
  } = useAgent();

  // 初始化加载智能体列表
  useEffect(() => {
    if (!loadingState.lastFetchTime) {
      fetchAgentList();
    }
  }, [fetchAgentList, loadingState.lastFetchTime]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        clearSearch();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clearSearch]);

  // 打开下拉菜单时聚焦搜索框
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    searchAgents(value);
  };

  // 处理智能体选择
  const handleAgentSelect = async (agent: Agent) => {
    try {
      selectAgent(agent.id);
      await activateAgent(agent.id);
      setIsOpen(false);
      setSearchTerm("");
      clearSearch();
    } catch (error) {
      console.error("Failed to activate agent:", error);
    }
  };

  // 处理智能体停用
  const handleDeactivate = async () => {
    try {
      await deactivateAgent();
      selectAgent(null);
    } catch (error) {
      console.error("Failed to deactivate agent:", error);
    }
  };

  // 获取显示的智能体列表
  const displayAgents = searchTerm ? filteredAgents : filteredAgents.slice(0, 10);

  // 为 avatar 添加 CDN 前缀
  const getAvatarUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `https://www.mcp-x.com/prod-api/${url.replace(/^\/+/, "")}`;
  };

  return (
    <div className={`agent-select ${className}`} ref={dropdownRef}>
      <div className="agent-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="agent-display">
          {activeAgent ? (
            <div className="active-agent">
              <div className="agent-avatar">
                {activeAgent.avatar ? (
                  <img src={getAvatarUrl(activeAgent.avatar)} alt={activeAgent.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {activeAgent.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="agent-info">
                <span className="agent-name">{activeAgent.name}</span>
                <span className="agent-status">激活中</span>
              </div>
            </div>
          ) : (
            <div className="no-agent">
              <div className="placeholder-avatar">🤖</div>
              <div className="placeholder-info">
                <span className="placeholder-text">选择智能体</span>
                <span className="placeholder-hint">点击选择</span>
              </div>
            </div>
          )}
        </div>
        <div className="dropdown-arrow">
          <svg
            className={`arrow-icon ${isOpen ? "rotate" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="agent-dropdown">
          <div className="dropdown-header">
            <div className="search-box">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜索智能体..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
              <div className="search-icon">🔍</div>
            </div>
          </div>

          <div className="dropdown-content">
            {loadingState.isFetchingList ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>加载中...</span>
              </div>
            ) : loadingState.error ? (
              <div className="error-state">
                <span className="error-icon">⚠️</span>
                <span>加载失败: {loadingState.error}</span>
              </div>
            ) : displayAgents.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🔍</span>
                <span>
                  {searchTerm 
                    ? "没有找到匹配的智能体" 
                    : filteredAgents.length === 0 
                      ? "智能体服务暂不可用" 
                      : "暂无智能体"
                  }
                </span>
              </div>
            ) : (
              <div className="agent-list">
                {/* 停用选项 */}
                {activeAgent && (
                  <div
                    className="agent-item deactivate-item"
                    onClick={handleDeactivate}
                  >
                    <div className="agent-avatar">
                      <div className="deactivate-icon">❌</div>
                    </div>
                    <div className="agent-info">
                      <span className="agent-name">停用智能体</span>
                      <span className="agent-description">返回默认助手模式</span>
                    </div>
                  </div>
                )}

                {/* 智能体列表 */}
                {displayAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`agent-item ${
                      activeAgent?.id === agent.id ? "active" : ""
                    }`}
                    onClick={() => handleAgentSelect(agent)}
                  >
                    <div className="agent-avatar">
                      {agent.avatar ? (
                        <img src={getAvatarUrl(agent.avatar)} alt={agent.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="agent-info">
                      <div className="agent-header">
                        <span className="agent-name">{agent.name}</span>
                        <div className="agent-stats">
                          <span className="usage-count">👥 {agent.usageCount}</span>
                          <span className="like-count">❤️ {agent.likeCount}</span>
                        </div>
                      </div>
                      <span className="agent-description">
                        {agent.description.length > 60
                          ? `${agent.description.substring(0, 60)}...`
                          : agent.description}
                      </span>
                      <div className="agent-tags">
                        {agent.tags.split(",").slice(0, 3).map((tag, index) => (
                          <span key={index} className="tag">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                    {activeAgent?.id === agent.id && (
                      <div className="active-indicator">✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!searchTerm && displayAgents.length >= 10 && (
            <div className="dropdown-footer">
              <span className="more-hint">输入关键词搜索更多智能体</span>
            </div>
          )}
        </div>
      )}

      {/* 加载状态指示器 */}
      {(loadingState.isActivating || loadingState.isDeactivating) && (
        <div className="action-loading">
          <div className="loading-spinner small"></div>
        </div>
      )}
    </div>
  );
};

export default AgentSelect; 