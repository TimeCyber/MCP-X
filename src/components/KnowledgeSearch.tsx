import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "../styles/components/_KnowledgeSearch.scss";

interface KnowledgeDocument {
  id: string;
  filename: string;
  content: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  onSelectDocument: (document: KnowledgeDocument) => void;
  onClose: () => void;
  searchQuery?: string;
}

const KnowledgeSearch: React.FC<Props> = ({ onSelectDocument, onClose, searchQuery = "" }) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 加载知识库文档
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/knowledge");
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤文档
  const filterDocuments = (docs: KnowledgeDocument[], query: string) => {
    if (!query.trim()) return docs;
    
    const lowercaseQuery = query.toLowerCase();
    return docs.filter(doc =>
      doc.filename.toLowerCase().includes(lowercaseQuery) ||
      doc.content.toLowerCase().includes(lowercaseQuery)
    ).sort((a, b) => {
      // 优先显示文件名匹配的文档
      const aNameMatch = a.filename.toLowerCase().includes(lowercaseQuery);
      const bNameMatch = b.filename.toLowerCase().includes(lowercaseQuery);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // 按照匹配度排序（简单的字符串匹配）
      const aScore = (a.filename.toLowerCase().indexOf(lowercaseQuery) !== -1 ? 10 : 0) +
                    (a.content.toLowerCase().indexOf(lowercaseQuery) !== -1 ? 1 : 0);
      const bScore = (b.filename.toLowerCase().indexOf(lowercaseQuery) !== -1 ? 10 : 0) +
                    (b.content.toLowerCase().indexOf(lowercaseQuery) !== -1 ? 1 : 0);
      
      return bScore - aScore;
    });
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 获取文档预览文本
  const getPreviewText = (content: string, query: string, maxLength: 150) => {
    if (!query.trim()) return content.substring(0, maxLength) + (content.length > maxLength ? "..." : "");
    
    const lowercaseContent = content.toLowerCase();
    const lowercaseQuery = query.toLowerCase();
    const index = lowercaseContent.indexOf(lowercaseQuery);
    
    if (index === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? "..." : "");
    }
    
    // 在匹配的文本周围显示上下文
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 100);
    const preview = content.substring(start, end);
    
    return (start > 0 ? "..." : "") + preview + (end < content.length ? "..." : "");
  };

  // 高亮显示搜索词
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredDocuments.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (filteredDocuments[selectedIndex]) {
          onSelectDocument(filteredDocuments[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  // 点击外部关闭
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  useEffect(() => {
    loadDocuments();
    
    // 聚焦到搜索框
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    
    // 添加点击外部事件监听
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const filtered = filterDocuments(documents, search);
    setFilteredDocuments(filtered);
    setSelectedIndex(0);
  }, [documents, search]);

  return (
    <div className="knowledge-search-overlay">
      <div className="knowledge-search" ref={containerRef} onKeyDown={handleKeyDown}>
        <div className="knowledge-search-header">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索知识库文档..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div className="knowledge-search-results">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>加载中...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-text">
                {search ? `未找到包含"${search}"的文档` : "暂无知识库文档"}
              </div>
            </div>
          ) : (
            <div className="documents-list">
              {filteredDocuments.map((doc, index) => (
                <div
                  key={doc.id}
                  className={`document-item ${index === selectedIndex ? "selected" : ""}`}
                  onClick={() => onSelectDocument(doc)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="document-header">
                    <div className="document-name">
                      {highlightText(doc.filename, search)}
                    </div>
                    <div className="document-meta">
                      <span className="file-type">{doc.fileType.toUpperCase()}</span>
                      <span className="file-size">{formatFileSize(doc.fileSize || 0)}</span>
                    </div>
                  </div>
                  <div className="document-preview">
                    {highlightText(getPreviewText(doc.content, search, 150), search)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="knowledge-search-footer">
          <div className="keyboard-hints">
            <span><kbd>↑↓</kbd> 导航</span>
            <span><kbd>Enter</kbd> 选择</span>
            <span><kbd>Esc</kbd> 关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeSearch;
