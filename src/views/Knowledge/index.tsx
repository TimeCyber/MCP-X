import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSetAtom } from "jotai";
import { showToastAtom } from "../../atoms/toastState";
import "../../styles/pages/_Knowledge.scss";

interface KnowledgeDocument {
  id: string;
  filename: string;
  content: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

const KnowledgeBase: React.FC = () => {
  const { t } = useTranslation();
  const showToast = useSetAtom(showToastAtom);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载知识库文档
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/knowledge");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.data || []);
      } else {
        console.error("Load documents failed:", data.message);
        showToast({ message: data.message || "加载知识库失败", type: "error" });
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      setError("无法连接到服务器，请检查网络连接");
      showToast({ message: "无法连接到服务器，请检查网络连接", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 上传文件
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/knowledge", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        showToast({ message: "文件上传成功", type: "success" });
        loadDocuments();
      } else {
        showToast({ message: data.message || "文件上传失败", type: "error" });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      showToast({ message: "文件上传失败", type: "error" });
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 删除文档
  const handleDeleteDocument = async (id: string) => {
    if (!confirm("确定要删除这个文档吗？")) return;

    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      
      if (data.success) {
        showToast({ message: "文档删除成功", type: "success" });
        setDocuments(docs => docs.filter(doc => doc.id !== id));
        if (selectedDocument?.id === id) {
          setSelectedDocument(null);
        }
      } else {
        showToast({ message: data.message || "文档删除失败", type: "error" });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      showToast({ message: "文档删除失败", type: "error" });
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  // 过滤文档
  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    // 延迟加载，确保组件完全挂载
    const timer = setTimeout(() => {
      loadDocuments();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="knowledge-base">
      <div className="knowledge-header">
        <h1>知识库管理</h1>
        <div className="header-actions">
          <input
            type="text"
            placeholder="搜索文档..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.csv,.xml,.html,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
          >
            {uploadLoading ? "上传中..." : "上传文件"}
          </button>
        </div>
      </div>

      <div className="knowledge-content">
        <div className="documents-list">
          <div className="documents-header">
            <h3>文档列表 ({filteredDocuments.length})</h3>
            {loading && <div className="loading">加载中...</div>}
          </div>
          
          <div className="documents-grid">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`document-card ${selectedDocument?.id === doc.id ? "selected" : ""}`}
                onClick={() => setSelectedDocument(doc)}
              >
                <div className="document-info">
                  <div className="document-name">{doc.filename}</div>
                  <div className="document-meta">
                    <span className="file-type">{doc.fileType.toUpperCase()}</span>
                    <span className="file-size">{formatFileSize(doc.fileSize || 0)}</span>
                  </div>
                  <div className="document-date">
                    创建于 {formatDate(doc.createdAt)}
                  </div>
                </div>
                <div className="document-actions">
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    }}
                    title="删除文档"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            
            {filteredDocuments.length === 0 && !loading && (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <div className="empty-title">暂无文档</div>
                <div className="empty-description">
                  {searchQuery ? "没有找到匹配的文档" : "点击上传文件来添加第一个文档"}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="document-preview">
          {selectedDocument ? (
            <div className="preview-content">
              <div className="preview-header">
                <h3>{selectedDocument.filename}</h3>
                <div className="preview-meta">
                  <span>类型: {selectedDocument.fileType.toUpperCase()}</span>
                  <span>大小: {formatFileSize(selectedDocument.fileSize || 0)}</span>
                  <span>更新时间: {formatDate(selectedDocument.updatedAt)}</span>
                </div>
              </div>
              <div className="preview-body">
                <pre className="document-content">{selectedDocument.content}</pre>
              </div>
            </div>
          ) : (
            <div className="preview-placeholder">
              <div className="placeholder-icon">📄</div>
              <div className="placeholder-text">选择一个文档来预览内容</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
