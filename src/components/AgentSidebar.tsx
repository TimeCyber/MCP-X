import React, { useEffect, useState, useRef, useCallback } from "react"
import { useAgent } from "../hooks/useAgent"
import "../styles/components/_AgentSidebar.scss"
import { useTranslation } from "react-i18next"

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
    clearSearch
  } = useAgent()

  const agentListRef = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false) // 本地加载状态跟踪
  const lastLoadTimeRef = useRef(0) // 防抖时间戳
  const searchInputRef = useRef<HTMLInputElement>(null) // 搜索框引用
  const prevIsFetchingList = useRef(loadingState.isFetchingList)
  const searchTriggeredRef = useRef(false) // 标记搜索是否由本组件触发
  const [isComposing, setIsComposing] = useState(false) // 使用state代替ref来跟踪IME状态
  const { t } = useTranslation()

  // 当由搜索/清空操作引发的加载完成时，强制重新聚焦
  useEffect(() => {
    // 检查加载状态是否从 true 变为 false，并且是搜索操作触发的
    if (prevIsFetchingList.current && !loadingState.isFetchingList && searchTriggeredRef.current) {
      searchInputRef.current?.focus()
      console.log('🎯 搜索/清空完成，强制重新聚焦')
      searchTriggeredRef.current = false // 重置标记，避免影响其他操作
    }
    // 更新上一次的加载状态
    prevIsFetchingList.current = loadingState.isFetchingList
  }, [loadingState.isFetchingList])

  // 本地搜索状态，用于控制输入框
  const [localSearchKeyword, setLocalSearchKeyword] = useState(searchKeyword)

  // 防抖搜索效果
  useEffect(() => {
    // 如果正在使用输入法组合，则不触发搜索
    if (isComposing) {
      return
    }

    const handler = setTimeout(() => {
      // 只有当本地关键词和全局关键词不同时才触发搜索
      if (localSearchKeyword !== searchKeyword) {
        console.log('🔍 防抖搜索触发:', localSearchKeyword)
        searchTriggeredRef.current = true // 标记本次加载由搜索框触发
        searchAgents(localSearchKeyword)
      }
    }, 500) // 500ms延迟

    return () => {
      clearTimeout(handler)
    }
  }, [localSearchKeyword, searchAgents, searchKeyword, isComposing])

  // 同步外部搜索关键词到本地状态
  useEffect(() => {
    setLocalSearchKeyword(searchKeyword)
  }, [searchKeyword])

  // 处理搜索输入变化（仅更新本地状态）
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearchKeyword(value)
  }, [])

  // 处理Escape键清空搜索
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      // 如果框内有内容，则清空
      if (localSearchKeyword) {
        console.log('🧹 Escape键清空搜索')
        searchTriggeredRef.current = true // 标记本次加载由清空操作触发
        setLocalSearchKeyword('')
      }
    }
  }, [localSearchKeyword])

  // 只在组件挂载后聚焦到搜索框
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
      console.log('🎯 组件挂载后聚焦搜索框')
    }
  }, [])

  // 清理定时器
  useEffect(() => {
    return () => {
      // 移除不再需要的防抖定时器引用和清理逻辑
    }
  }, [])

  // 只在首次挂载且未初始化时调用fetchAgentList，避免循环调用
  useEffect(() => {
    if (!loadingState.isInitialized) {
      console.log('🚀 AgentSidebar 检测到未初始化，开始获取智能体列表')
      fetchAgentList()
    } else {
      console.log('💾 AgentSidebar 检测到已初始化，跳过数据加载')
    }
  }, [fetchAgentList, loadingState.isInitialized])

  // 同步加载状态
  useEffect(() => {
    isLoadingMoreRef.current = loadingState.isLoadingMore
  }, [loadingState.isLoadingMore])

  const getAvatarUrl = (url: string) => {
    if (!url) return ""
    if (url.startsWith("http")) return url
    return `https://www.mcp-x.com/prod-api/${url.replace(/^\/+/, "")}`
  }

  // 加载更多数据的防抖包装
  const loadMoreWithDebounce = useCallback(async () => {
    const now = Date.now()
    
    // 防抖：如果距离上次调用少于1秒，则忽略
    if (now - lastLoadTimeRef.current < 1000) {
      console.log('⏰ 防抖：忽略重复调用 loadMoreAgents')
      return
    }
    
    // 如果正在加载，则忽略
    if (isLoadingMoreRef.current) {
      console.log('🔄 正在加载中，忽略重复调用')
      return
    }
    
    lastLoadTimeRef.current = now
    isLoadingMoreRef.current = true
    
    console.log('🚀 开始加载更多数据...')
    
    try {
      await loadMoreAgents()
      console.log('✅ 加载更多数据成功')
    } catch (error) {
      console.error('❌ 加载更多数据失败:', error)
    } finally {
      // 延迟重置状态，确保状态同步
      setTimeout(() => {
        isLoadingMoreRef.current = false
      }, 500)
    }
  }, [loadMoreAgents])

  // 滚动监听，自动加载下一页
  const handleScroll = useCallback((e: Event) => {
    // 搜索状态下不支持滚动加载更多
    if (!agentListRef.current || !paginationMode || searchKeyword) return

    const container = agentListRef.current
    const { scrollTop, scrollHeight, clientHeight } = container

    // 计算是否接近底部
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isNearBottom = distanceFromBottom <= 100 // 增加触发区域到100px

    console.log('滚动事件触发:', {
      scrollTop: scrollTop.toFixed(0),
      scrollHeight: scrollHeight.toFixed(0),
      clientHeight: clientHeight.toFixed(0),
      distanceFromBottom: distanceFromBottom.toFixed(0),
      isNearBottom,
      hasNextPage: pagination.hasNextPage,
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      isFetchingList: loadingState.isFetchingList,
      isLoadingMore: loadingState.isLoadingMore,
      isLoadingMoreLocal: isLoadingMoreRef.current,
      agentsCount: filteredAgents.length
    })

    // 当滚动到距离底部100px以内且有下一页时，自动加载下一页
    if (isNearBottom && 
        pagination.hasNextPage && 
        !loadingState.isFetchingList && 
        !isLoadingMoreRef.current) {
      console.log('🎯 满足加载条件，触发加载更多！')
      loadMoreWithDebounce()
    }
  }, [paginationMode, searchKeyword, loadingState.isFetchingList, pagination.hasNextPage, pagination.currentPage, pagination.totalPages, filteredAgents.length, loadMoreWithDebounce])

  // 添加滚动监听器
  useEffect(() => {
    const container = agentListRef.current
    if (!container) return

    // 添加多种滚动事件监听，确保PC端兼容性
    const scrollOptions = { passive: true }
    
    container.addEventListener('scroll', handleScroll, scrollOptions)
    container.addEventListener('wheel', handleScroll, scrollOptions) // 鼠标滚轮事件
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('wheel', handleScroll)
    }
  }, [handleScroll])

  // 添加键盘滚动支持
  useEffect(() => {
    const container = agentListRef.current
    if (!container) return

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'End') {
        // 延迟执行滚动检查，确保滚动位置已更新
        setTimeout(() => handleScroll(e as any), 100)
      }
    }

    container.addEventListener('keydown', handleKeydown)
    return () => container.removeEventListener('keydown', handleKeydown)
  }, [handleScroll])

  return (
    <div className="agent-sidebar">
      <div className="sidebar-header">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            type="text"
            placeholder={t("sidebar.searchAgents")}
            value={localSearchKeyword}
            onChange={e => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="search-input"
            disabled={loadingState.isFetchingList}
            ref={searchInputRef}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
          />
          {localSearchKeyword && (
            <button 
              className="clear-search-btn" 
              onClick={() => {
                console.log('🧹 点击按钮清空搜索')
                searchTriggeredRef.current = true // 标记本次加载由清空操作触发
                setLocalSearchKeyword('')
              }}
              title="清空搜索 (Esc)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
      </div>

      <div className="agent-list" ref={agentListRef} tabIndex={0}>
        {loadingState.isFetchingList && filteredAgents.length === 0 ? (
          <div className="loading-indicator initial-load">
            <div className="spinner" />
          </div>
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
            
            {/* 搜索状态下不显示分页相关UI */}
            {!searchKeyword && (
              <>
                {/* 加载更多指示器 */}
                {paginationMode && pagination.hasNextPage && (
                  <div className="load-more-indicator">
                    {(loadingState.isLoadingMore || isLoadingMoreRef.current) ? (
                      <div className="loading-indicator">
                        <div className="spinner" />
                      </div>
                    ) : (
                      <div className="scroll-hint">向下滚动加载更多 (第{pagination.currentPage}/{pagination.totalPages}页)</div>
                    )}
                  </div>
                )}
                
                {/* 如果没有更多页面，显示提示 */}
                {paginationMode && !pagination.hasNextPage && pagination.totalPages > 1 && (
                  <div className="end-message">
                    已加载全部 {pagination.total} 个智能体
                  </div>
                )}
              </>
            )}
            
            {/* 搜索状态下显示搜索结果统计 */}
            {searchKeyword && (
              <div className="search-result-info">
                找到 {filteredAgents.length} 个匹配的智能体
              </div>
            )}
            
            {/* 底部padding，确保最后一个item完全可见 */}
            <div className="list-bottom-padding"></div>
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