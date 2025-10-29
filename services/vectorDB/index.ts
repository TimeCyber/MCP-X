import { simpleVectorDB } from './simpleVectorDB.js';
import logger from '../utils/logger.js';

// 向量数据库管理类（使用简单实现）
export class VectorDBService {
  private isInitialized = false;

  constructor() {
    // 使用简单的内存向量数据库
  }

  // 初始化
  async initialize(): Promise<void> {
    try {
      // 简单向量数据库不需要特殊初始化
      this.isInitialized = true;
      logger.info('简单向量数据库初始化成功');
    } catch (error) {
      logger.error('向量数据库初始化失败:', error);
      throw error;
    }
  }

  // 添加文档到向量数据库
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
    if (!this.isInitialized) {
      throw new Error('向量数据库未初始化');
    }

    return simpleVectorDB.addDocument(id, content, metadata);
  }

  // 更新文档
  async updateDocument(
    id: string,
    content: string,
    metadata: {
      filename: string;
      fileType: string;
      fileSize?: number;
      updatedAt: string;
    }
  ): Promise<void> {
    // 先删除旧文档
    await this.deleteDocument(id);
    // 再添加新文档
    await this.addDocument(id, content, {
      ...metadata,
      createdAt: metadata.updatedAt
    });
  }

  // 删除文档
  async deleteDocument(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('向量数据库未初始化');
    }

    return simpleVectorDB.deleteDocument(id);
  }

  // 相似度搜索
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
    if (!this.isInitialized) {
      throw new Error('向量数据库未初始化');
    }

    return simpleVectorDB.searchSimilarDocuments(query, limit, threshold);
  }

  // 获取统计信息
  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
  }> {
    if (!this.isInitialized) {
      return { totalDocuments: 0, totalChunks: 0 };
    }

    return simpleVectorDB.getStats();
  }
}

// 单例实例
export const vectorDB = new VectorDBService();
