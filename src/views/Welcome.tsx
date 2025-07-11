import React, { useState, useRef, KeyboardEvent, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useSetAtom, useAtom, useAtomValue } from "jotai"
import { codeStreamingAtom } from "../atoms/codeStreaming"
import { useTranslation } from "react-i18next"
import { historiesAtom, loadHistoriesAtom } from "../atoms/historyState"
import { activeConfigAtom, currentModelSupportToolsAtom, isConfigActiveAtom, isConfigNotInitializedAtom } from "../atoms/configState"
import Setup from "./Setup"
import { openOverlayAtom } from "../atoms/layerState"
import useHotkeyEvent from "../hooks/useHotkeyEvent"
import Textarea from "../components/WrappedTextarea"
import Tooltip from "../components/Tooltip"
import { loadToolsAtom, toolsAtom } from "../atoms/toolState"
import { showToastAtom } from "../atoms/toastState"

// 为window添加ipcRenderer类型声明
declare global {
  interface Window {
    ipcRenderer: any;
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0)
    return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const Welcome = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateStreamingCode = useSetAtom(codeStreamingAtom)
  const histories = useAtomValue(historiesAtom)
  const loadHistories = useSetAtom(loadHistoriesAtom)
  const isConfigNotInitialized = useAtomValue(isConfigNotInitializedAtom)
  const isComposing = useRef(false)
  const openOverlay = useSetAtom(openOverlayAtom)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const loadTools = useSetAtom(loadToolsAtom)
  const tools = useAtomValue(toolsAtom)
  const hasActiveConfig = useAtomValue(isConfigActiveAtom)
  const supportTools = useAtomValue(currentModelSupportToolsAtom)
  const activeConfig = useAtomValue(activeConfigAtom)
  const [isDragging, setIsDragging] = useState(false)
  const [webSearchMode, setWebSearchMode] = useState(false)
  const showToast = useSetAtom(showToastAtom)

  useEffect(() => {
    document.title = t("header.title")
    loadTools()
    
    // 检查Tavily MCP服务是否启用
    const checkTavilyStatus = async () => {
      try {
        const response = await fetch("/api/config/mcpserver");
        const data = await response.json();
        
        if (data.success) {
          const mcpConfig = data.config || {};
          
          // 查找Tavily相关的MCP服务
          const tavilyServerName = Object.keys(mcpConfig.mcpServers || {}).find(
            name => name.toLowerCase().includes('tavily') || 
                  (mcpConfig.mcpServers[name].description || '').toLowerCase().includes('tavily') ||
                  (mcpConfig.mcpServers[name].env && 
                    Object.entries(mcpConfig.mcpServers[name].env).some(([key]) => 
                      key.toLowerCase().includes('tavily')
                    ))
          );
          
          // 如果找到Tavily服务，检查其启用状态
          if (tavilyServerName) {
            const isEnabled = mcpConfig.mcpServers[tavilyServerName].enabled;
            setWebSearchMode(isEnabled);
          }
        }
      } catch (error) {
        console.error("Failed to check Tavily status:", error);
      }
    };
    
    checkTavilyStatus();
  }, [])

  useEffect(() => {
    updateStreamingCode(null)
  }, [updateStreamingCode])

  useEffect(() => {
    loadHistories()
  }, [loadHistories])

  useHotkeyEvent("chat-input:upload-file", () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  })

  useHotkeyEvent("chat-input:focus", () => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasActiveConfig)
      return

    if (message.trim() || uploadedFiles.length > 0) {
      navigate("/chat", {
        state: {
          initialMessage: message,
          files: uploadedFiles
        }
      })
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey || isComposing.current) {
        return
      }

      handleSubmit(e)
    }
  }

  const handleCompositionStart = () => {
    isComposing.current = true
  }

  const handleCompositionEnd = () => {
    isComposing.current = false
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const isImageFile = (file: File) => {
    return file.type.startsWith("image/")
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items)
      return

    const imageItems = Array.from(items).filter(item => item.type.startsWith("image/"))
    if (imageItems.length === 0)
      return

    const newFiles = await Promise.all(
      imageItems.map(async item => {
        const blob = item.getAsFile()
        if (!blob)
          return null

        const ext = blob.type.split("/")[1]
        const filename = `pasted_image_${Date.now()}.${ext}`
        return new File([blob], filename, { type: blob.type })
      })
    )

    const validFiles = newFiles.filter((file): file is File => file !== null)
    setUploadedFiles(prev => [...prev, ...validFiles])
  }

  const handleFiles = (files: File[]) => {
    const existingFiles = uploadedFiles

    const newFiles = files.filter(newFile => {
      const isDuplicate = existingFiles.some(existingFile => {
        if (existingFile.name !== newFile.name)
          return false

        if (existingFile.size !== newFile.size)
          return false

        if (existingFile.lastModified !== newFile.lastModified)
          return false

        return true
      })

      return !isDuplicate
    })

    if (newFiles.length === 0)
      return

    setUploadedFiles(prev => [...prev, ...newFiles])

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      uploadedFiles.forEach(file => {
        dataTransfer.items.add(file)
      })
      fileInputRef.current.files = dataTransfer.files
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const toggleTavilyMCP = async (enable: boolean) => {
    try {
      const response = await fetch("/api/config/mcpserver");
      const data = await response.json();
      
      if (data.success) {
        const mcpConfig = data.config || {};
        const newConfig = JSON.parse(JSON.stringify(mcpConfig));
        
        const tavilyServerName = Object.keys(newConfig.mcpServers || {}).find(
          name => name.toLowerCase().includes('tavily') || 
                (newConfig.mcpServers[name].description || '').toLowerCase().includes('tavily') ||
                (newConfig.mcpServers[name].env && 
                  Object.entries(newConfig.mcpServers[name].env).some(([key]) => 
                    key.toLowerCase().includes('tavily')
                  ))
        );
        
        if (tavilyServerName) {
          newConfig.mcpServers[tavilyServerName].enabled = enable;
          
          const result = await fetch("/api/config/mcpserver?force=1", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newConfig),
          }).then(res => res.json());
          
          if (result.success) {
            showToast({
              message: enable ? t("chat.webSearchEnabled") : t("chat.webSearchDisabled"),
              type: "success"
            });
          } else {
            throw new Error(result.message || "Failed to update MCP config");
          }
        } else {
          showToast({
            message: t("chat.tavilyNotFound"),
            type: "error"
          });
        }
      } else {
        throw new Error(data.message || "Failed to fetch MCP config");
      }
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : t("chat.toggleWebSearchFailed"),
        type: "error"
      });
      setWebSearchMode(!enable);
    }
  };

  if (isConfigNotInitialized) {
    return <Setup />
  }

  return (
    <div className="main-container">
      <div className="welcome-content">
        <h1>{t("welcome.title")}</h1>
        <p className="subtitle">{t("welcome.subtitle")}</p>

        <div className="welcome-input-wrapper">
          {activeConfig?.model && activeConfig?.model !== "none" && !supportTools && (
            <div className="chat-input-banner">
              {t("chat.unsupportTools", { model: activeConfig?.model })}
            </div>
          )}
          {(!activeConfig?.model || activeConfig?.model == "none") && (
            <div className="chat-input-banner">
              {t("chat.noModelBanner")}
            </div>
          )}
          <form
            className="welcome-input"
            onSubmit={handleSubmit}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div
              className={`drag-overlay ${isDragging ? 'show' : ''}`}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                className="drag-overlay-bg"
                onDrop={handleDrop}
              ></div>
              <div className="drag-overlay-text">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 22 22" width="22" height="22">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"></path>
                  <path fill="currentColor" d="M6.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3 16l4-4 2 2 6-4.5 4 4.5v1.999L3 16Z"></path>
                </svg>
                {t('chat.dragFiles')}
              </div>
            </div>
            <div className="input-container">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onPaste={handlePaste}
                placeholder={t("chat.placeholder")}
                autoFocus={true}
                rows={2}
              />
              <div className="input-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <div className="left-actions">
                  <button
                    type="button"
                    className="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title={t("chat.uploadFile")}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`search-btn ${webSearchMode ? 'active' : ''}`}
                    onClick={() => {
                      const newMode = !webSearchMode;
                      setWebSearchMode(newMode);
                      toggleTavilyMCP(newMode);
                    }}
                    title={webSearchMode ? t('chat.webSearchEnabled') : t('chat.webSearch')}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={webSearchMode ? "var(--text-pri-blue)" : "currentColor"} xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15V16C9 17.1 9.9 18 11 18V19.93ZM17.9 17.39C17.64 16.58 16.9 16 16 16H15V13C15 12.45 14.55 12 14 12H8V10H10C10.55 10 11 9.55 11 9V7H13C14.1 7 15 6.1 15 5V4.59C17.93 5.78 20 8.65 20 12C20 14.08 19.21 15.97 17.9 17.39Z"/>
                    </svg>
                  </button>
                </div>
                <div className="right-actions">
                  <button
                    className="tools-btn"
                    onClick={(e) => {
                      e.preventDefault()
                      openOverlay("Tools")
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                    </svg>
                    {`${tools.length} ${t("chat.tools")}`}
                  </button>
                  <Tooltip
                    content={!hasActiveConfig ? t("chat.noModelAlert") : t("chat.send")}
                  >
                    <button type="submit" className="send-btn" disabled={(!message.trim() && uploadedFiles.length === 0) || !hasActiveConfig}>
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </form>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="uploaded-files-preview">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="file-item">
                {isImageFile(file) ? (
                  <div className="image-preview">
                    <img src={URL.createObjectURL(file)} alt={file.name} />
                  </div>
                ) : (
                  <div className="file-info">
                    <div className="file-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                      </svg>
                    </div>
                    <div className="file-details">
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeFile(index)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="suggestions">
          {histories.length > 0 && histories.slice(0, 3).map(history => (
            <div
              key={history.id}
              className="suggestion-item"
              onClick={() => navigate(`/chat/${history.id}`)}
            >
              <div className="content-wrapper">
                <strong>{history.title || t("chat.untitledChat")}</strong>
              </div>
              <div className="bottom-row">
                <p>{new Date(history.createdAt).toLocaleString()}</p>
                <span className="arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 在Welcome组件中添加Deep Linking测试区域 */}
      {/* <DeepLinkingTestSection /> */}
    </div>
  )
}

export default React.memo(Welcome)

// 在Welcome组件中添加Deep Linking测试区域
const DeepLinkingTestSection = () => {
  const testLinks = [
    { id: 1, name: "智能体 #1" },
    { id: 2, name: "智能体 #2" },
    { id: 123, name: "智能体 #123" },
  ]

  const handleTestLink = (agentId: number) => {
    const url = `mcp-x://agent/${agentId}`
    navigator.clipboard.writeText(url).then(() => {
      alert(`Deep Link已复制到剪贴板: ${url}\n\n你可以在浏览器或其他应用中粘贴这个链接来测试Deep Linking功能。`)
    }).catch(() => {
      alert(`测试链接: ${url}`)
    })
  }

  return (
    <div style={{ 
      marginTop: '2rem', 
      padding: '1rem', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>Deep Linking 测试</h3>
      <p>点击下面的按钮复制Deep Link，然后在外部应用中打开：</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {testLinks.map(link => (
          <button
            key={link.id}
            onClick={() => handleTestLink(link.id)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {link.name}
          </button>
        ))}
      </div>
      <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
        注意：Deep Linking功能需要应用完全启动后才能正常工作。
      </p>
    </div>
  )
}
