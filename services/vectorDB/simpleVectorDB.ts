import logger from '../utils/logger.js';

// 简单的内存向量数据库实现
// 这个版本不依赖外部服务，直接使用简单的文本相似度计算

interface DocumentChunk {
  id: string;
  originalId: string;
  content: string;
  metadata: {
    filename: string;
    fileType: string;
    fileSize?: number;
    createdAt: string;
    chunkIndex: number;
    chunkCount: number;
  };
}

export class SimpleVectorDB {
  private documents: Map<string, DocumentChunk[]> = new Map();

  // 添加文档
  async addDocument(
    id: string,
    content: string,
    metadata: {
      filename: string;
      fileType: string;
      fileSize?: number;
      createdAt: string;
    }
  ): Promise<void> {
    try {
      // 将文档分块
      const chunks = this.splitIntoChunks(content, 1000);
      const documentChunks: DocumentChunk[] = [];

      chunks.forEach((chunk, index) => {
        documentChunks.push({
          id: `${id}_chunk_${index}`,
          originalId: id,
          content: chunk,
          metadata: {
            ...metadata,
            chunkIndex: index,
            chunkCount: chunks.length
          }
        });
      });

      this.documents.set(id, documentChunks);
      logger.info(`文档 ${metadata.filename} 已添加到向量数据库，共 ${chunks.length} 个片段`);
    } catch (error) {
      logger.error('添加文档到向量数据库失败:', error);
      throw error;
    }
  }

  // 删除文档
  async deleteDocument(id: string): Promise<void> {
    try {
      if (this.documents.has(id)) {
        this.documents.delete(id);
        logger.info(`文档 ${id} 已从向量数据库删除`);
      }
    } catch (error) {
      logger.error('从向量数据库删除文档失败:', error);
      throw error;
    }
  }

  // 相似度搜索（基于简单的文本匹配）
  async searchSimilarDocuments(
    query: string,
    limit: number = 5,
    threshold: number = 0.3
  ): Promise<{
    documents: string[];
    metadatas: any[];
    distances: number[];
    ids: string[];
  }> {
    try {
      const results: Array<{
        chunk: DocumentChunk;
        similarity: number;
      }> = [];

      // 遍历所有文档片段，计算相似度
      for (const [_, chunks] of this.documents) {
        for (const chunk of chunks) {
          const similarity = this.calculateSimilarity(query, chunk.content);
          if (similarity >= threshold) {
            results.push({ chunk, similarity });
          }
        }
      }

      // 按相似度排序
      results.sort((a, b) => b.similarity - a.similarity);

      // 取前N个结果
      const topResults = results.slice(0, limit);

      const documents = topResults.map(r => r.chunk.content);
      const metadatas = topResults.map(r => r.chunk.metadata);
      const distances = topResults.map(r => 1 - r.similarity); // 转换为距离
      const ids = topResults.map(r => r.chunk.id);

      logger.info(`相似度搜索完成，查询："${query}"，找到 ${documents.length} 个相关片段`);
      return { documents, metadatas, distances, ids };
    } catch (error) {
      logger.error('向量数据库搜索失败:', error);
      throw error;
    }
  }

  // 获取统计信息
  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
  }> {
    let totalChunks = 0;
    for (const [_, chunks] of this.documents) {
      totalChunks += chunks.length;
    }

    return {
      totalDocuments: this.documents.size,
      totalChunks
    };
  }

  // 简单的文本相似度计算（基于关键词匹配）
  private calculateSimilarity(query: string, content: string): number {
    const queryWords = this.tokenize(query.toLowerCase());
    const contentWords = this.tokenize(content.toLowerCase());
    
    if (queryWords.length === 0 || contentWords.length === 0) {
      return 0;
    }

    // 计算交集词数
    const intersection = queryWords.filter(word => contentWords.includes(word));
    
    // 使用 Jaccard 相似度
    const union = new Set([...queryWords, ...contentWords]);
    const jaccardSimilarity = intersection.length / union.size;

    // 考虑长度匹配度
    const lengthRatio = Math.min(queryWords.length, contentWords.length) / 
                       Math.max(queryWords.length, contentWords.length);

    // 综合相似度
    return (jaccardSimilarity * 0.7 + lengthRatio * 0.3);
  }

  // 简单的分词
  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // 保留中英文字符
      .split(/\s+/)
      .filter(word => word.length > 1); // 过滤单字符
  }

  // 文档分块
  private splitIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[。！？.!?]\s*/);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (sentence.trim().length === 0) continue;
      
      const proposedChunk = currentChunk + (currentChunk ? '。' : '') + sentence.trim();
      
      if (proposedChunk.length <= maxChunkSize) {
        currentChunk = proposedChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentence.trim();
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    // 如果没有分出任何块，至少返回原文本的截断版本
    if (chunks.length === 0) {
      chunks.push(text.substring(0, maxChunkSize));
    }
    
    return chunks;
  }
}

// 单例实例
export const simpleVectorDB = new SimpleVectorDB();
