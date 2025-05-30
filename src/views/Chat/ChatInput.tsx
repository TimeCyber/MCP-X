import React, { useState, useRef, useEffect, useCallback } from "react"
import { useTranslation } from 'react-i18next'
import Tooltip from "../../components/Tooltip"
import useHotkeyEvent from "../../hooks/useHotkeyEvent"
import Textarea from "../../components/WrappedTextarea"
import { lastMessageAtom } from "../../atoms/chatState"
import { useAtomValue, useSetAtom } from "jotai"
import { activeConfigAtom, currentModelSupportToolsAtom, isConfigActiveAtom } from "../../atoms/configState"
import { showToastAtom } from "../../atoms/toastState"

interface Props {
  onSendMessage?: (message: string, files?: FileList) => void
  disabled?: boolean
  onAbort: () => void
}

interface FilePreview {
  type: 'image' | 'file'
  url?: string
  name: string
  size: string
}

const ACCEPTED_FILE_TYPES = [
  '*/*'
].join(',')

const ChatInput: React.FC<Props> = ({ onSendMessage, disabled, onAbort }) => {
  const { t } = useTranslation()
  const [message, setMessage] = useState("")
  const [previews, setPreviews] = useState<FilePreview[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevDisabled = useRef(disabled)
  const uploadedFiles = useRef<File[]>([])
  const isComposing = useRef(false)
  const [isAborting, setIsAborting] = useState(false)
  const lastMessage = useAtomValue(lastMessageAtom)
  const hasActiveConfig = useAtomValue(isConfigActiveAtom)
  const supportTools = useAtomValue(currentModelSupportToolsAtom)
  const activeConfig = useAtomValue(activeConfigAtom)
  const [isDragging, setIsDragging] = useState(false)
  const [webSearchMode, setWebSearchMode] = useState(false)
  const showToast = useSetAtom(showToastAtom)

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }, [])

  const handleFiles = (files: File[]) => {
    const existingFiles = uploadedFiles.current

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

    const newPreviews = newFiles.map(file => {
      const preview: FilePreview = {
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        size: formatFileSize(file.size)
      }

      if (preview.type === 'image') {
        preview.url = URL.createObjectURL(file)
      }

      return preview
    })

    setPreviews(prev => [...prev, ...newPreviews])
    uploadedFiles.current = [...existingFiles, ...newFiles]

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      uploadedFiles.current.forEach(file => {
        dataTransfer.items.add(file)
      })
      fileInputRef.current.files = dataTransfer.files
    }
  }

  const removeFile = (index: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    uploadedFiles.current = uploadedFiles.current.filter((_, i) => i !== index)

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      uploadedFiles.current.forEach(file => {
        dataTransfer.items.add(file)
      })

      if (uploadedFiles.current.length === 0) {
        fileInputRef.current.value = ''
      } else {
        fileInputRef.current.files = dataTransfer.files
      }
    }

    setPreviews(prev => {
      const newPreviews = [...prev]
      if (newPreviews[index].type === 'image' && newPreviews[index].url) {
        URL.revokeObjectURL(newPreviews[index].url)
      }
      newPreviews.splice(index, 1)
      return newPreviews
    })
  }

  const handlePaste = (e: ClipboardEvent) => {
    if (document.activeElement !== textareaRef.current)
      return

    const items = e.clipboardData?.items
    if (!items)
      return

    const imageItems = Array.from(items).filter(item => item.type.startsWith("image/"))
    if (imageItems.length === 0)
      return

    if (imageItems.length > 0) {
      e.preventDefault()
      const files = imageItems.map(item => item.getAsFile()).filter((file): file is File => file !== null)
      handleFiles(files)
    }
  }

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

  useHotkeyEvent("chat-input:paste-last-message", () => {
    if (lastMessage) {
      setMessage(m => m + lastMessage)
    }
  })

  useEffect(() => {
    document.addEventListener("paste", handlePaste)
    
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
    
    return () => {
      document.removeEventListener("paste", handlePaste)
      previews.forEach(preview => {
        if (preview.type === 'image' && preview.url) {
          URL.revokeObjectURL(preview.url)
        }
      })
    }
  }, [])

  useEffect(() => {
    if (prevDisabled.current && !disabled) {
      textareaRef.current?.focus()
    }
    prevDisabled.current = disabled
    setIsAborting(false)
  }, [disabled])

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && disabled) {
        e.stopPropagation()
        e.preventDefault()
        setIsAborting(true)
        onAbort()
      }
    }

    window.addEventListener("keydown", handleKeydown)
    return () => {
      window.removeEventListener("keydown", handleKeydown)
    }
  }, [disabled])

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      window.ipcRenderer.showInputContextMenu()
    }

    if (textareaRef.current) {
      textareaRef.current.addEventListener("contextmenu", handleContextMenu)
    }

    return () => {
      if (textareaRef.current) {
        textareaRef.current.removeEventListener("contextmenu", handleContextMenu)
      }
    }
  }, [])

  const adjustHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    textarea.style.height = "auto"
    if (e.target.value.includes("\n")) {
      textarea.style.height = `${textarea.scrollHeight}px`
    }
    setMessage(e.target.value)
  }

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && !uploadedFiles.current.length) || !onSendMessage || disabled || !hasActiveConfig)
      return

    onSendMessage(message, fileInputRef.current?.files || undefined)
    setMessage("")
    resetTextareaHeight()

    uploadedFiles.current = []
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    setPreviews(prev => {
      prev.forEach(preview => {
        if (preview.type === 'image' && preview.url) {
          URL.revokeObjectURL(preview.url)
        }
      })
      return []
    })
  }

  const onKeydown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || isComposing.current) {
      return
    }

    if (e.key === "Enter" && disabled) {
      return
    }

    e.preventDefault()
    handleSubmit(e)
  }

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true
  }, [])

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false
  }, [])

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
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

  return (
    <div className="chat-input-wrapper">
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
      <footer
        className="chat-input"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className={`drag-overlay ${isDragging ? 'show' : ''}`}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drag-overlay-bg"
          onDrop={handleDrop}></div>
          <div className="drag-overlay-text">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 22 22" width="22" height="22">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"></path>
              <path fill="currentColor" d="M6.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3 16l4-4 2 2 6-4.5 4 4.5v1.999L3 16Z"></path>
            </svg>
            {t('chat.dragFiles')}
          </div>
        </div>
        <div className="input-wrapper">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={adjustHeight}
            onKeyDown={onKeydown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={t('chat.placeholder')}
            rows={1}
          />
        </div>
        <div className="input-actions">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept={ACCEPTED_FILE_TYPES}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <div className="left-actions">
            <button
              className="upload-btn"
              onClick={handleFileClick}
              disabled={disabled}
              title={t('chat.uploadFile')}
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
          {(disabled && !isAborting) ? (
            <Tooltip type="controls" content={<>{t("chat.abort")}<span className="key">Esc</span></>}>
              <button
                className="abort-btn"
                onClick={() => {
                  setIsAborting(true)
                  onAbort()
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none">
                  <path fill="currentColor" d="M7 8.89A1.89 1.89 0 0 1 8.89 7h4.22A1.89 1.89 0 0 1 15 8.89v4.22A1.89 1.89 0 0 1 13.11 15H8.89A1.89 1.89 0 0 1 7 13.11V8.89Z"></path>
                  <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="2"></circle>
                </svg>
              </button>
            </Tooltip>
          ) : (
            <Tooltip type="controls" content={!hasActiveConfig ? t("chat.noModelAlert") : t('chat.send')}>
              <button
                className="send-btn"
                onClick={handleSubmit}
                disabled={disabled || !hasActiveConfig}
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </Tooltip>
          )}
        </div>
        {previews.length > 0 && (
          <div className="file-previews">
            {previews.map((preview, index) => (
              <div key={index} className={`preview-item ${preview.type}`}>
                {preview.type === 'image' ? (
                  <img src={preview.url} alt={preview.name} />
                ) : (
                  <div className="file-info">
                    <div className="file-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                    </div>
                    <div className="file-details">
                      <div className="file-name">{preview.name}</div>
                      <div className="file-size">{preview.size}</div>
                    </div>
                  </div>
                )}
                <button
                  className="remove-preview"
                  onClick={(e) => removeFile(index, e)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </footer>
    </div>
  )
}

export default React.memo(ChatInput)
