import React, { useCallback, useEffect, useRef, useState } from "react"
import { useAgentState } from "../hooks/useAgent"
import ChatMessages, { Message } from "./Chat/ChatMessages"
import ChatInput from "./Chat/ChatInput"
import "../styles/components/_AgentChatPanel.scss"

// Agent Chat Panel: 会话区 + 角色信息侧栏
const AgentChatPanel: React.FC = () => {
  const { selectedAgent } = useAgentState()

  // 聊天相关状态
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const currentId = useRef(0)
  const chatIdRef = useRef<string | null>(null)

  // 当切换智能体时，重置对话并插入开场白
  useEffect(() => {
    if (selectedAgent) {
      chatIdRef.current = null // 新对话
      currentId.current = 0
      const greeting: Message = {
        id: `${currentId.current++}`,
        text: selectedAgent.openSay,
        isSent: false,
        timestamp: Date.now()
      }
      setMessages([greeting])
    }
  }, [selectedAgent])

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

  const onSend = useCallback((text: string, files?: FileList) => {
    if (!selectedAgent || isSending) return

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

    const formData = new FormData()
    if (text) formData.append("message", text)
    if (chatIdRef.current) formData.append("chatId", chatIdRef.current)
    if (selectedAgent.name) formData.append("agentName", selectedAgent.name) // 添加agent名称
    if (files) Array.from(files).forEach(f => formData.append("files", f))

    handlePost(formData, "formData", "/api/chat")
  }, [selectedAgent, isSending, handlePost])

  if (!selectedAgent) {
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
        <h3>角色设定</h3>
        <pre className="role-text">{selectedAgent.systemPromote}</pre>
      </div>
    </div>
  )
}

export default AgentChatPanel 