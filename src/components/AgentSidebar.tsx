import React, { useEffect, useState, useRef, useCallback } from "react"
import { useAgent } from "../hooks/useAgent"
import "../styles/components/_AgentSidebar.scss"

const AgentSidebar: React.FC = () => {
  const { 
    fetchAgentList, 
    filteredAgents, 
    activeAgent,
    selectedAgent, 
    searchAgents, 
    searchKeyword, 
    selectAgent, 
    activateAgent,
    pagination,
    paginationMode,
    loadingState,
    loadMoreAgents,
    setPageSize,
    togglePaginationMode
  } = useAgent()

  const [showPaginationSettings, setShowPaginationSettings] = useState(false)
  const agentListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAgentList()
  }, [fetchAgentList])

  const getAvatarUrl = (url: string) => {
    if (!url) return ""
    if (url.startsWith("http")) return url
    return `https://www.mcp-x.com/prod-api/${url.replace(/^\/+/, "")}`
  }

  // 滚动监听，自动加载下一页
  const handleScroll = useCallback(() => {
    if (!agentListRef.current || !paginationMode || loadingState.isFetchingList) return

    const container = agentListRef.current
    const { scrollTop, scrollHeight, clientHeight } = container

    // 当滚动到距离底部50px以内时，自动加载下一页
    if (scrollHeight - scrollTop - clientHeight < 50 && pagination.hasNextPage) {
      loadMoreAgents()
    }
  }, [paginationMode, loadingState.isFetchingList, pagination.hasNextPage, loadMoreAgents])

  // 添加滚动监听器
  useEffect(() => {
    const container = agentListRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // 渲染分页信息
  const renderPaginationInfo = () => {
    if (!paginationMode) return null

    return (
      <div className="pagination-info">
        <span className="page-summary">
          第 {pagination.currentPage} 页 / 共 {pagination.totalPages} 页
        </span>
        <span className="total-count">
          总共 {pagination.total} 个智能体
        </span>
      </div>
    )
  }

  // 渲染设置菜单
  const renderSettings = () => (
    <div className="sidebar-settings">
      <button
        className="settings-toggle"
        onClick={() => setShowPaginationSettings(!showPaginationSettings)}
        title="分页设置"
      >
        ⚙️
      </button>
      
      {showPaginationSettings && (
        <div className="settings-dropdown">
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={paginationMode}
                onChange={togglePaginationMode}
              />
              启用分页模式
            </label>
          </div>
          
          {paginationMode && (
            <div className="setting-item">
              <label>每页显示：</label>
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                disabled={loadingState.isFetchingList}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="agent-sidebar">
      <div className="sidebar-header">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            type="text"
            placeholder="Search Agents..."
            value={searchKeyword}
            onChange={e => searchAgents(e.target.value)}
            className="search-input"
            disabled={loadingState.isFetchingList}
          />
        </div>
        {/* {renderSettings()} */}
      </div>

      {/* {renderPaginationInfo()} */}

      <div className="agent-list" ref={agentListRef}>
        {loadingState.isFetchingList && filteredAgents.length === 0 ? (
          <div className="loading-message">正在加载智能体...</div>
        ) : filteredAgents.length === 0 ? (
          <div className="empty-message">暂无智能体</div>
        ) : (
          <>
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className={`agent-item ${selectedAgent?.id === agent.id ? 'active' : ''}`}
                onClick={() => selectAgent(agent.id)}
                onDoubleClick={() => activateAgent(agent.id)}
                title={`${agent.name}\n${agent.description || ''}`}
              >
                <div className="agent-avatar">
                  {agent.avatar ? (
                    <img 
                      src={getAvatarUrl(agent.avatar)} 
                      alt={agent.name}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement
                        const fallback = target.nextElementSibling as HTMLElement
                        target.style.display = 'none'
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <span style={{ display: agent.avatar ? 'none' : 'flex' }}>
                    {agent.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="agent-info">
                  <div className="agent-name">{agent.name}</div>
                  {agent.description && (
                    <div className="agent-description">{agent.description}</div>
                  )}
                </div>
              </div>
            ))}
            
            {/* 加载更多指示器 */}
            {paginationMode && pagination.hasNextPage && (
              <div className="load-more-indicator">
                {loadingState.isLoadingMore ? (
                  <div className="loading-spinner">正在加载更多...</div>
                ) : (
                  <div className="scroll-hint">向下滚动加载更多</div>
                )}
              </div>
            )}
          </>
        )}

        {loadingState.error && (
          <div className="error-message">
            加载失败: {loadingState.error}
            <button 
              className="retry-btn"
              onClick={() => fetchAgentList()}
            >
              重试
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AgentSidebar 