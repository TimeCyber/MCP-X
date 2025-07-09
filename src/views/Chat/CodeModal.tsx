import React, { useRef, useEffect, useCallback, useState } from "react"
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { tomorrow, darcula } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { themeAtom } from '../../atoms/themeState'
import { useAtom, useAtomValue } from 'jotai'
import { codeStreamingAtom } from '../../atoms/codeStreaming'
import { useTranslation } from "react-i18next"
import CodePreview from "./CodePreview"
import { useLayer } from "../../hooks/useLayer"
import { isChatStreamingAtom } from "../../atoms/chatState"
import Tooltip from "../../components/Tooltip"

type TabType = "code" | "preview"

const supportedPreviewLanguage = [
  "mermaid",
  "html",
  "svg",
  "xml",
]

const CodeModal = () => {
  const theme = useAtomValue(themeAtom)
  const codeModalRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>("code")
  const isChatStreaming = useAtomValue(isChatStreamingAtom)

  const [streamingCode, updateStreamingCode] = useAtom(codeStreamingAtom)
  const code = streamingCode?.code || ""

  const { pushLayer, closeLayer } = useLayer({
    type: "Surface",
    onClose: () => {
      if (isChatStreaming) {
        return false
      }

      closeCodeModal()
    },
  })

  const scrollCodeToBottom = useCallback(() => {
    if (codeModalRef.current) {
      const pre = codeModalRef.current.querySelector("pre")
      if (pre) {
        pre.scrollTop = pre.scrollHeight
      }
    }
  }, [])

  const closeCodeModal = () => {
    updateStreamingCode({ code: "", language: "" })
    closeLayer()
  }

  useEffect(() => {
    scrollCodeToBottom()
    setActiveTab("code")
  }, [streamingCode])

  useEffect(() => {
    if (!isChatStreaming && streamingCode?.code) {
      pushLayer()
    }
  }, [isChatStreaming, streamingCode?.code, pushLayer])

  useEffect(() => {
    if (!isChatStreaming && supportedPreviewLanguage.includes(streamingCode?.language || "")) {
      setActiveTab("preview")
    }
  }, [isChatStreaming, streamingCode?.language])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const isHtml = streamingCode?.language?.toLowerCase() === "html"
  const htmlIframeRef = useRef<HTMLIFrameElement>(null)

  if (!streamingCode || !streamingCode.code)
    return null

  return (
    <div className="code-modal">
      <div className="code-modal-content">
        <div className="code-modal-header">
          <div className="header-left">
            <Tooltip
              content={t("common.close")}
            >
              <button
                className="close-btn"
                onClick={closeCodeModal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M14 3L6 11L14 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </Tooltip>
            <span className="language">{streamingCode?.language}</span>
          </div>
          <div className="header-right">
            {supportedPreviewLanguage.includes(streamingCode?.language || "") && (
              <>
                <div className="code-modal-tabs">
                  <Tooltip
                    content={t("chat.code")}
                  >
                    <button
                      className={`tab-btn ${activeTab === "code" ? "active" : ""}`}
                      onClick={() => setActiveTab("code")}
                    >
                      <span className="tab-btn-text">{t("chat.code")}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M17 7L21 11L17 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 15L1 11L5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 4L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip
                    content={t("chat.preview")}
                  >
                    <button
                      className={`tab-btn ${activeTab === "preview" ? "active" : ""}`}
                      onClick={() => setActiveTab("preview")}
                    >
                      <span className="tab-btn-text">{t("chat.preview")}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M20 11C20 11 16.4669 6 11 6C5.53313 6 2 11 2 11C2 11 5.53203 16 11 16C16.468 16 20 11 20 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M11 15.5C13.4853 15.5 15.5 13.4853 15.5 11C15.5 8.51472 13.4853 6.5 11 6.5C8.51472 6.5 6.5 8.51472 6.5 11C6.5 13.4853 8.51472 15.5 11 15.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                      </svg>
                      </button>
                  </Tooltip>
                </div>
                <Tooltip
                  content={t("chat.copyCode")}
                >
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(code)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22px" height="22px" viewBox="0 0 22 22" fill="transparent">
                      <path d="M13 20H2V6H10.2498L13 8.80032V20Z" fill="transparent" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinejoin="round"/>
                      <path d="M13 9H10V6L13 9Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 3.5V2H17.2498L20 4.80032V16H16" fill="transparent" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinejoin="round"/>
                      <path d="M20 5H17V2L20 5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </Tooltip>

                {/* Save HTML Button */}
                <Tooltip
                  content={t("chat.save", { defaultValue: "Save" })}
                >
                  <button
                    className="copy-btn"
                    onClick={() => {
                      const escapeHtml = (unsafe: string) => unsafe.replace(/[&<>"]/g, (c) => {
                        const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
                        return map[c] || c
                      })

                      const lang = (streamingCode?.language || "").toLowerCase()

                      let htmlContent = code
                      if (lang === "html" && htmlIframeRef.current) {
                        const doc = htmlIframeRef.current.contentDocument
                        if (doc) {
                          htmlContent = doc.documentElement.outerHTML
                        }
                      }

                      const bodyContent = lang === "html" ? htmlContent : `<pre><code>${escapeHtml(code)}</code></pre>`
                      const html = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Code Preview</title>` +
                        (lang === "mermaid" ? `<script src=\"https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js\"></script>` : "") +
                        `</head><body>${bodyContent}` +
                        (lang === "mermaid" ? `<script>mermaid.initialize({startOnLoad:true});</script>` : "") +
                        `</body></html>`

                      const blob = new Blob([html], { type: "text/html" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = "code_preview.html"
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22px" height="22px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        </div>
        <div className="code-modal-body" ref={codeModalRef}>
          {activeTab === "code" && (
            <SyntaxHighlighter
              language={streamingCode?.language.toLowerCase() || ""}
              style={theme === "dark" ? tomorrow : darcula}
              showLineNumbers={true}
              customStyle={{
                margin: 0,
                height: '100%',
                background: 'transparent'
              }}
              codeTagProps={{
                style: {
                  fontSize: '14px',
                  lineHeight: '1.5'
                }
              }}
            >
              {code}
            </SyntaxHighlighter>
          )}
          {activeTab === "preview" && (
            (
              isHtml ? (
                <iframe
                  ref={htmlIframeRef}
                  className="html-preview"
                  sandbox="allow-scripts allow-same-origin"
                  title="HTML Preview"
                  srcDoc={code}
                  onLoad={() => {
                    if (htmlIframeRef.current) {
                      const doc = htmlIframeRef.current.contentDocument
                      if (doc) {
                        doc.designMode = "on"
                      }
                    }
                  }}
                />
              ) : (
            <CodePreview language={streamingCode?.language || ""} code={code} />
              )
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default React.memo(CodeModal)