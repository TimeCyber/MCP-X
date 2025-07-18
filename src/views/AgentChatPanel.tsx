import React, { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { useAgent, useAgentState } from "../hooks/useAgent"
import ChatMessages, { Message } from "./Chat/ChatMessages"
import ChatInput from "./Chat/ChatInput"
import "../styles/components/_AgentChatPanel.scss"
import { useAgentUpdater } from "../hooks/useAgent"
import { useSetAtom, useAtomValue } from "jotai"
import { 
  addUsedAgentAtom, 
  getAgentChatHistoryAtom, 
  saveAgentChatHistoryAtom,
  AgentMessage 
} from "../atoms/agentState"

// 从URL hash中提取agentId的函数
const getAgentIdFromHash = (): string | null => {
  const hash = window.location.hash
  const match = hash.match(/\/agent\/(\d+)/)
  return match ? match[1] : null
}

// Agent Chat Panel: 会话区 + 角色信息侧栏
const AgentChatPanel: React.FC = () => {
  const { agentId: routerAgentId } = useParams<{ agentId: string }>()
  const { agentList, selectedAgent } = useAgentState()
  const { fetchAgentList, selectAgent, activateAgent } = useAgent()
  const { updateAgent } = useAgentUpdater()
  const setAddUsedAgent = useSetAtom(addUsedAgentAtom)

  // 调试信息
  useEffect(() => {
    // console.log('=== AGENT CHAT PANEL RENDER ===')
    // console.log('Router agentId:', routerAgentId)
    // console.log('Hash agentId:', getAgentIdFromHash())
    // console.log('Final agentId:', routerAgentId || getAgentIdFromHash())
    // console.log('Selected agent:', selectedAgent)
    // console.log('Agent list length:', agentList.length)
    // console.log('================================')
  }, [routerAgentId, selectedAgent, agentList.length]) // 添加依赖数组

  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false)
  const [editedRole, setEditedRole] = useState("")

  // 聊天相关状态
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const currentId = useRef(0)
  const chatIdRef = useRef<string | null>(null)
  
  // 消息保存跟踪
  const lastSavedMessages = useRef<Message[]>([])
  const lastSavedAgentId = useRef<number | null>(null)

  // 添加全局状态管理
  const getAgentChatHistory = useAtomValue(getAgentChatHistoryAtom)
  const saveAgentChatHistory = useSetAtom(saveAgentChatHistoryAtom)

  // 获取agentId：优先使用Router参数，如果没有则从URL hash中提取
  const agentId = routerAgentId || getAgentIdFromHash()

  // 当切换智能体时，重置对话并插入开场白
  // useEffect(() => {
  //   if (selectedAgent) {
  //     chatIdRef.current = null // 新对话
  //     currentId.current = 0
  //     setEditedRole(selectedAgent.systemPromote) // 初始化编辑内容
  //     const greeting: Message = {
  //       id: `${currentId.current++}`,
  //       text: selectedAgent.openSay,
  //       isSent: false,
  //       timestamp: Date.now()
  //     }
  //     setMessages([greeting])
  //   }
  // }, [selectedAgent])

  // 当切换智能体时，加载对话历史或初始化新对话
  useEffect(() => {
    if (selectedAgent) {
      console.log('=== 智能体切换 ===')
      console.log('当前智能体ID:', selectedAgent.id)
      console.log('智能体名称:', selectedAgent.name)
      
      chatIdRef.current = null // 新对话
      setEditedRole(selectedAgent.systemPromote) // 初始化编辑内容
      
      // 立即清空当前显示的消息，确保不显示其他智能体的历史
      setMessages([])
      
      // 尝试从全局状态加载该智能体的对话历史
      const savedMessages = getAgentChatHistory(selectedAgent.id)
      console.log('加载的历史消息数量:', savedMessages.length)
      if (savedMessages.length > 0) {
        console.log('历史消息前两条:', savedMessages.slice(0, 2))
        console.log('第一条消息详细信息:', {
          id: savedMessages[0]?.id,
          text: savedMessages[0]?.text,
          isSent: savedMessages[0]?.isSent,
          timestamp: savedMessages[0]?.timestamp
        })
      }
      
      if (savedMessages.length > 0) {
        // 如果有保存的对话历史，恢复它
        const agentMessages = savedMessages as Message[]
        console.log('准备恢复的消息:', agentMessages.map(msg => ({ 
          id: msg.id, 
          text: msg.text ? msg.text.substring(0, 50) + '...' : 'TEXT为空!', 
          isSent: msg.isSent 
        })))
        setMessages(agentMessages)
        
        // 延迟检查setMessages是否生效
        setTimeout(() => {
          console.log('setMessages后检查，当前messages长度:', messages.length)
        }, 100)
        
        // 找到最大的ID，确保新消息ID不冲突
        const maxId = Math.max(...agentMessages.map(msg => parseInt(msg.id) || 0))
        currentId.current = maxId + 1
        // 更新保存记录
        lastSavedMessages.current = [...agentMessages]
        lastSavedAgentId.current = selectedAgent.id
        console.log('恢复历史记录，消息数量:', agentMessages.length)
      } else {
        // 如果没有历史记录，显示开场白
        currentId.current = 0
        const greeting: Message = {
          id: `${currentId.current++}`,
          text: selectedAgent.openSay,
          isSent: false,
          timestamp: Date.now()
        }
        setMessages([greeting])
        // 更新保存记录
        lastSavedMessages.current = [greeting]
        lastSavedAgentId.current = selectedAgent.id
        console.log('显示开场白')
      }
      console.log('==================')
    } else {
      // 如果没有选中的智能体，清空对话
      setMessages([])
      lastSavedMessages.current = []
      lastSavedAgentId.current = null
    }
  }, [selectedAgent?.id]) // 只依赖智能体ID的变化

  // 监控messages状态变化的调试useEffect
  useEffect(() => {
    console.log('=== Messages状态变化 ===')
    console.log('当前messages长度:', messages.length)
    console.log('前3条消息:', messages.slice(0, 3).map(msg => ({ 
      id: msg.id, 
      text: msg.text.substring(0, 30) + '...', 
      isSent: msg.isSent 
    })))
    console.log('========================')
  }, [messages])

  // 当消息发生变化时，保存到全局状态（仅在有实际变化时）
  useEffect(() => {
    if (selectedAgent && messages.length > 0 && !isSending) { // 添加isSending检查
      // 检查消息是否真的发生了变化
      const messagesChanged = JSON.stringify(messages) !== JSON.stringify(lastSavedMessages.current)
      
      console.log('=== 消息保存检查 ===')
      console.log('当前智能体ID:', selectedAgent.id)
      console.log('消息数量:', messages.length)
      console.log('消息是否变化:', messagesChanged)
      console.log('是否正在发送:', isSending)
      console.log('lastSavedAgentId:', lastSavedAgentId.current)
      
      if (messagesChanged) {
        // 过滤掉可能不完整的消息（没有text内容的消息）
        const validMessages = messages.filter(msg => msg.text && msg.text.trim().length > 0)
        
        if (validMessages.length > 0) {
          // 转换消息格式并保存
          const agentMessages: AgentMessage[] = validMessages.map(msg => ({
            id: msg.id,
            text: msg.text,
            isSent: msg.isSent,
            timestamp: msg.timestamp,
            files: msg.files,
            isError: msg.isError
          }))
          console.log('准备保存的消息内容检查:', agentMessages.map(msg => ({
            id: msg.id,
            text: msg.text ? msg.text.substring(0, 30) + '...' : 'TEXT为空!',
            isSent: msg.isSent
          })))
          
          // 使用防抖，避免频繁保存
          const timeoutId = setTimeout(() => {
            saveAgentChatHistory(selectedAgent.id, agentMessages)
            lastSavedMessages.current = [...messages]
            lastSavedAgentId.current = selectedAgent.id
            console.log('已保存消息，数量:', agentMessages.length)
          }, 1000) // 1秒防抖
          
          return () => clearTimeout(timeoutId)
        } else {
          console.log('没有有效消息可保存（所有消息都缺少text内容）')
        }
      }
      console.log('====================')
    }
  }, [messages, selectedAgent?.id, saveAgentChatHistory, isSending]) // 添加isSending依赖

  // 处理Agent选择的通用函数
  const handleAgentSelection = useCallback(async (targetAgentId: number) => {
    // 如果Agent列表还没有加载，先加载
    if (agentList.length === 0) {
      try {
        const result = await fetchAgentList()
        // fetchAgentList可能返回Agent数组或分页结果，我们需要获取实际的agents数组
        const agents = Array.isArray(result) ? result : result?.data || agentList
        
        // 加载完成后，检查目标Agent是否存在
        const targetAgent = agents.find((agent: any) => agent.id === targetAgentId)
        if (targetAgent) {
          selectAgent(targetAgentId)
        } else {
          console.warn('Agent not found after fetch:', targetAgentId)
        }
      } catch (err) {
        console.error('Failed to fetch agent list:', err)
      }
    } else {
      // 检查目标Agent是否存在
      const targetAgent = agentList.find((agent: any) => agent.id === targetAgentId)
      if (targetAgent) {
        selectAgent(targetAgentId)
      } else {
        // 如果在现有列表中找不到，尝试刷新列表
        try {
          const result = await fetchAgentList(true) // 强制刷新
          const agents = Array.isArray(result) ? result : result?.data || agentList
          const targetAgent = agents.find((agent: any) => agent.id === targetAgentId)
          if (targetAgent) {
            selectAgent(targetAgentId)
          } else {
            console.warn('Agent not found after refresh:', targetAgentId)
          }
        } catch (err) {
          console.error('Failed to refresh agent list:', err)
        }
      }
    }
  }, [agentList, selectedAgent, fetchAgentList, selectAgent])

  // 监听URL hash变化
  useEffect(() => {
    const handleHashChange = () => {
      const newAgentId = getAgentIdFromHash()
      if (newAgentId) {
        const targetAgentId = parseInt(newAgentId, 10)
        if (!isNaN(targetAgentId)) {
          handleAgentSelection(targetAgentId)
        }
      }
    }

    // 监听hashchange事件
    window.addEventListener('hashchange', handleHashChange)
    
    // 组件挂载时也检查一次
    handleHashChange()

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [handleAgentSelection])

  // 跟踪已处理的agent ID，避免无限重试
  const [processedAgentId, setProcessedAgentId] = useState<string | null>(null)
  
  // 当URL参数中的agentId改变时，自动选择对应的Agent
  useEffect(() => {
    if (agentId && agentId !== processedAgentId) {
      const targetAgentId = parseInt(agentId, 10)
      if (!isNaN(targetAgentId)) {
        // 标记该agent ID为已处理
        setProcessedAgentId(agentId)
        
        // 如果Agent列表还没有加载，先加载
        if (agentList.length === 0) {
          console.log('Loading agent list for deeplink...')
          fetchAgentList().then(() => {
            const targetAgent = agentList.find(agent => agent.id === targetAgentId)
            if (targetAgent) {
              console.log('Found agent after list load, selecting:', targetAgent)
              selectAgent(targetAgentId)
            } else {
              console.warn('Agent not found after list load:', targetAgentId)
              console.log('Available agents:', agentList.map(a => ({ id: a.id, name: a.name })))
            }
          }).catch(err => {
            console.error('Failed to fetch agent list:', err)
          })
        } else {
          // 检查目标Agent是否存在
          const targetAgent = agentList.find(agent => agent.id === targetAgentId)
          if (targetAgent) {
            console.log('Found agent in existing list, selecting:', targetAgent)
            selectAgent(targetAgentId)
          } else {
            console.warn('Agent not found:', targetAgentId)
            console.log('Available agents:', agentList.map(a => ({ id: a.id, name: a.name })))
          }
        }
      }
    }
  }, [agentId, agentList, fetchAgentList, selectAgent, processedAgentId])

  const handleEdit = () => {
    setEditedRole(selectedAgent?.systemPromote || "")
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!selectedAgent) return
    // Optimistic update
    const originalAgent = { ...selectedAgent }
    const updatedAgent = { ...selectedAgent, systemPromote: editedRole }
    
    // 调用hook进行更新 (hook内部处理API和状态)
    try {
      await updateAgent(updatedAgent)
      setIsEditing(false)
    } catch (error) {
      // Revert on failure
      console.error("Failed to update agent:", error)
      // 可以添加一个toast提示用户失败
    }
  }

  const scrollToBottom = () => {
    // 交给 ChatMessages 自己处理（它已有 scrollIntoView 逻辑）
  }

  const onAbort = useCallback(async () => {
    // 暂不支持中断
  }, [])

  const handlePost = useCallback(async (body: any, type: "json" | "formData", url: string) => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: type === "json" ? { "Content-Type": "application/json" } : {},
        body: body
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let currentText = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const dataStr = line.slice(5)
          if (dataStr.trim() === "[DONE]") continue

          try {
            const dataObj = JSON.parse(dataStr)
            if (dataObj.error) {
              setMessages(prev => {
                const newMsgs = [...prev]
                newMsgs[newMsgs.length - 1].text = `Error: ${dataObj.error}`
                newMsgs[newMsgs.length - 1].isError = true
                return newMsgs
              })
              break
            }

            const data = JSON.parse(dataObj.message)
            if (data.type === "text") {
              currentText += data.content
              setMessages(prev => {
                const newMsgs = [...prev]
                newMsgs[newMsgs.length - 1].text = currentText
                return newMsgs
              })
            }
          } catch (err) {
            console.error("parse sse error", err)
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }, [])

  const onSend = useCallback(async (text: string, files?: FileList) => {
    if (!selectedAgent || isSending) return

    // 在发送消息前，先强制激活当前选中的智能体，确保后端状态同步
    try {
      await activateAgent(selectedAgent.id);
    } catch (error) {
      console.error("Failed to activate agent before sending message:", error);
      // 可选择性地向用户显示错误提示
    }

    const userMsg: Message = {
      id: `${currentId.current++}`,
      text,
      isSent: true,
      timestamp: Date.now(),
      files: files ? Array.from(files) : undefined
    }

    const aiPlaceholder: Message = {
      id: `${currentId.current++}`,
      text: "",
      isSent: false,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMsg, aiPlaceholder])
    setIsSending(true)

    // 记录智能体使用
    setAddUsedAgent(selectedAgent)

    const formData = new FormData()
    if (text) formData.append("message", text)
    if (chatIdRef.current) formData.append("chatId", chatIdRef.current)
    if (selectedAgent.name) formData.append("agentName", selectedAgent.name) // 添加agent名称
    if (files) Array.from(files).forEach(f => formData.append("files", f))

    handlePost(formData, "formData", "/api/chat")
  }, [selectedAgent, isSending, handlePost, activateAgent, setAddUsedAgent])

  // 如果没有选中的Agent，显示加载或提示信息
  if (!selectedAgent) {
    if (agentId) {
      return <div className="agent-chat-panel placeholder">正在加载智能体...</div>
    }
    return <div className="agent-chat-panel placeholder">请选择左侧智能体查看详情</div>
  }

  const questions: string[] = selectedAgent.questions ? selectedAgent.questions.split(/[|,，;；。\n\r]+/).filter(Boolean).slice(0, 4) : []

  return (
    <div className="agent-chat-panel">
      <div className="conversation">
        <div className="conversation-header">
          <h2 className="agent-name">{selectedAgent.name}</h2>
          {questions.length > 0 && (
            <ul className="question-list">
              {questions.map((q, idx) => (
                <li key={idx} onClick={() => onSend(q.trim())}>{q.trim()}</li>
              ))}
            </ul>
          )}
        </div>
        <ChatMessages messages={messages} isLoading={isSending} onRetry={() => {}} onEdit={() => {}} />
        <ChatInput onSendMessage={onSend} disabled={isSending} onAbort={onAbort} />
      </div>
      <div className="role-info">
        <div className="role-info-header">
          <h3>角色设定</h3>
          {!isEditing && (
             <button onClick={handleEdit} className="edit-btn">
               <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z"/></svg>
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="role-edit-mode">
            <textarea
              className="role-textarea"
              value={editedRole}
              onChange={(e) => setEditedRole(e.target.value)}
              rows={10}
            />
            <div className="edit-actions">
              <button onClick={handleCancel} className="cancel-btn">取消</button>
              <button onClick={handleSave} className="save-btn">保存</button>
            </div>
          </div>
        ) : (
          <pre className="role-text">{selectedAgent.systemPromote}</pre>
        )}
      </div>
    </div>
  )
}

export default AgentChatPanel 