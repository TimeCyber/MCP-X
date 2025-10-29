import { vectorDB } from '../vectorDB/index.js';
import logger from '../utils/logger.js';

// 知识库检索服务
export class KnowledgeRetrievalService {
  
  // 智能检索相关文档
  async retrieveRelevantDocuments(
    query: string,
    options: {
      maxResults?: number;
      threshold?: number;
      includeSource?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    documents: Array<{
      content: string;
      filename: string;
      fileType: string;
      similarity: number;
      chunkIndex?: number;
    }>;
    totalFound: number;
    query: string;
  }> {
    const {
      maxResults = 5,
      threshold = 0.6,
      includeSource = true
    } = options;

    try {
      // 使用向量数据库进行相似度搜索
      const searchResults = await vectorDB.searchSimilarDocuments(
        query,
        maxResults,
        threshold
      );

      const documents = searchResults.documents.map((content, index) => {
        const metadata = searchResults.metadatas[index];
        const distance = searchResults.distances[index];
        const similarity = 1 - (distance || 1); // 转换为相似度分数

        return {
          content: content || '',
          filename: metadata?.filename || '未知文件',
          fileType: metadata?.fileType || 'unknown',
          similarity: Math.round(similarity * 100) / 100, // 保留两位小数
          chunkIndex: metadata?.chunkIndex,
          ...(includeSource && {
            source: {
              originalId: metadata?.originalId,
              createdAt: metadata?.createdAt,
              chunkCount: metadata?.chunkCount
            }
          })
        };
      });

      logger.info(`知识库检索完成: 查询"${query}", 找到${documents.length}个相关文档片段`);

      return {
        success: true,
        documents,
        totalFound: documents.length,
        query
      };

    } catch (error) {
      logger.error('知识库检索失败:', error);
      return {
        success: false,
        documents: [],
        totalFound: 0,
        query
      };
    }
  }

  // 为聊天生成知识库上下文
  async generateContextForChat(
    userMessage: string,
    options: {
      maxContextLength?: number;
      maxDocuments?: number;
    } = {}
  ): Promise<string> {
    const {
      maxContextLength = 3000, // 最大上下文长度
      maxDocuments = 3
    } = options;

    try {
      const retrievalResult = await this.retrieveRelevantDocuments(
        userMessage,
        {
          maxResults: maxDocuments,
          threshold: 0.5, // 降低阈值以获取更多可能相关的内容
          includeSource: false
        }
      );

      if (!retrievalResult.success || retrievalResult.documents.length === 0) {
        return '';
      }

      // 构建知识库上下文
      let context = '参考知识库信息:\n\n';
      let currentLength = context.length;

      for (const doc of retrievalResult.documents) {
        const docInfo = `文档: ${doc.filename} (相似度: ${(doc.similarity * 100).toFixed(1)}%)\n${doc.content}\n\n`;
        
        // 检查是否超出长度限制
        if (currentLength + docInfo.length > maxContextLength) {
          // 如果单个文档就超出限制，截断内容
          const remainingLength = maxContextLength - currentLength - 200; // 预留200字符
          if (remainingLength > 100) { // 如果还有足够空间
            const truncatedContent = doc.content.substring(0, remainingLength) + '...';
            context += `文档: ${doc.filename} (相似度: ${(doc.similarity * 100).toFixed(1)}%)\n${truncatedContent}\n\n`;
          }
          break;
        }

        context += docInfo;
        currentLength += docInfo.length;
      }

      context += '---\n\n';
      
      logger.info(`为聊天生成知识库上下文: ${retrievalResult.documents.length}个文档, 总长度${context.length}字符`);
      return context;

    } catch (error) {
      logger.error('生成聊天上下文失败:', error);
      return '';
    }
  }

  // 检查用户消息是否需要知识库检索
  async shouldUseKnowledgeBase(userMessage: string): Promise<boolean> {
    // 简单的启发式规则
    const knowledgeIndicators = [
      '查询', '搜索', '找', '什么是', '如何', '怎么',
      '解释', '说明', '告诉我', '帮我了解', '详细',
      '文档', '资料', '信息', '数据', '内容'
    ];

    const lowerMessage = userMessage.toLowerCase();
    
    // 检查是否包含知识库相关的关键词
    const hasKnowledgeIndicator = knowledgeIndicators.some(indicator => 
      lowerMessage.includes(indicator)
    );

    // 检查消息长度（较长的问题更可能需要知识库支持）
    const isDetailedQuery = userMessage.length > 10;

    // 获取知识库统计信息
    const stats = await vectorDB.getStats();
    const hasDocuments = stats.totalDocuments > 0;

    return hasDocuments && (hasKnowledgeIndicator || isDetailedQuery);
  }

  // 获取知识库统计信息
  async getKnowledgeBaseStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    isAvailable: boolean;
  }> {
    try {
      const stats = await vectorDB.getStats();
      return {
        ...stats,
        isAvailable: true
      };
    } catch (error) {
      logger.error('获取知识库统计信息失败:', error);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        isAvailable: false
      };
    }
  }
}

// 导出单例实例
export const knowledgeRetrieval = new KnowledgeRetrievalService();