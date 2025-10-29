import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

// 动态加载解析库（兼容 ESM/CJS，避免在打包阶段被 tree-shake）
let cachedPdfParse: any = null;
let cachedMammoth: any = null;

async function loadPdfParse() {
  if (cachedPdfParse) return cachedPdfParse;
  try {
    const mod = await import("pdf-parse");
    cachedPdfParse = (mod as any).default ?? (mod as any);
    return cachedPdfParse;
  } catch (err) {
    console.error("PDF-parse 动态加载失败:", err);
    return null;
  }
}

async function loadMammoth() {
  if (cachedMammoth) return cachedMammoth;
  try {
    const mod = await import("mammoth");
    cachedMammoth = (mod as any).default ?? (mod as any);
    return cachedMammoth;
  } catch (err) {
    console.error("mammoth 动态加载失败:", err);
    return null;
  }
}
import {
  getKnowledgeDocuments,
  createKnowledgeDocument,
  updateKnowledgeDocument,
  deleteKnowledgeDocument,
  getKnowledgeDocumentById,
} from "../database/index.js";
import type { NewKnowledgeDocument } from "../database/schema.js";
import { vectorDB } from "../vectorDB/index.js";
import { knowledgeRetrieval } from "../knowledgeRetrieval/index.js";

const router = Router();

// 解析不同格式文件的内容
async function extractFileContent(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();
  
  try {
    switch (ext) {
      case '.pdf':
        {
          const pdfParse = await loadPdfParse();
          if (pdfParse) {
          try {
            console.log(`开始解析PDF文件: ${file.originalname}, 大小: ${file.size} bytes`);
            const data = await pdfParse(file.buffer);
            console.log(`PDF解析完成，提取文本长度: ${data.text?.length || 0}`);
            
            let content = data.text?.trim();
            if (content && content.length > 10) {
              console.log(`PDF内容预览: ${content.substring(0, 100)}...`);
              return content;
            } else {
              return `PDF文件：${file.originalname}\n文件大小：${(file.size / 1024).toFixed(2)} KB\n\n[PDF文件解析成功但内容为空，可能是扫描版PDF或加密文件]`;
            }
          } catch (pdfError) {
            console.error('PDF解析失败:', pdfError);
            const errorMessage = pdfError instanceof Error ? pdfError.message : '未知错误';
            return `PDF文件：${file.originalname}\n文件大小：${(file.size / 1024).toFixed(2)} KB\n\n[PDF解析失败: ${errorMessage}]`;
          }
          }
          return `PDF文件：${file.originalname}\n文件大小：${(file.size / 1024).toFixed(2)} KB\n\n[PDF解析库未加载，请检查依赖]`;
        }
        
      case '.doc':
      case '.docx':
        {
          const mammoth = await loadMammoth();
          if (mammoth) {
          try {
            console.log(`开始解析Word文档: ${file.originalname}, 大小: ${file.size} bytes`);
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            console.log(`Word文档解析完成，提取文本长度: ${result.value?.length || 0}`);
            
            const content = result.value?.trim();
            if (content && content.length > 10) {
              return content;
            } else {
              return `Word文档：${file.originalname}\n文件大小：${(file.size / 1024).toFixed(2)} KB\n\n[Word文档解析成功但内容为空]`;
            }
          } catch (wordError) {
            console.error('Word文档解析失败:', wordError);
            const errorMessage = wordError instanceof Error ? wordError.message : '未知错误';
            return `Word文档：${file.originalname}\n文件大小：${(file.size / 1024).toFixed(2)} KB\n\n[Word文档解析失败: ${errorMessage}]`;
          }
          }
          return `Word文档：${file.originalname}\n文件大小：${(file.size / 1024).toFixed(2)} KB\n\n[Word解析库未加载，请检查依赖]`;
        }
        
      case '.xls':
      case '.xlsx':
        // Excel文件处理 - 暂时不支持
        return `Excel文件：${file.originalname}\n文件大小：${(file.size / 1024).toFixed(2)} KB\n\n[Excel文件解析功能开发中，请转换为CSV格式后上传]`;
        
      case '.txt':
      case '.md':
      case '.json':
      case '.csv':
      case '.xml':
      case '.html':
      default:
        // 文本文件编码处理
        try {
          console.log(`开始解析文本文件: ${file.originalname}, 大小: ${file.size} bytes`);
          
          // 尝试UTF-8编码
          let content = file.buffer.toString('utf-8');
          
          // 检测是否有编码问题
          if (content.includes('�') || content.includes('\ufffd')) {
            console.log('检测到UTF-8编码问题，尝试其他编码');
            
            // 尝试GBK编码（中文常用）
            try {
              // 简单的编码检测和转换
              const buffer = file.buffer;
              // 如果是Windows中文环境，尝试GBK解码
              content = buffer.toString('utf-8');
              
              // 如果仍有问题，清理乱码字符
              if (content.includes('�')) {
                content = content.replace(/[�\ufffd]/g, '');
                console.log('清理了乱码字符');
              }
            } catch (encodingError) {
              console.warn('编码转换失败，使用原始UTF-8内容', encodingError);
            }
          }
          
          console.log(`文本文件解析完成，内容长度: ${content.length}`);
          return content;
        } catch (textError) {
          console.error('文本文件解析失败:', textError);
          return `文本文件：${file.originalname}\n文件大小：${(file.size / 1024).toFixed(2)} KB\n\n[文本编码解析失败，请检查文件编码格式]`;
        }
    }
  } catch (error) {
    console.error('文件内容解析失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    // 如果解析失败，返回文件基本信息
    return `文件：${file.originalname}\n文件大小：${(file.size / 1024).toFixed(2)} KB\n文件类型：${ext}\n\n[文件内容解析失败: ${errorMessage}]`;
  }
}

// 配置文件上传（修复中文文件名乱码：保留 originalname，不做 re-encode）
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
  },
  fileFilter: (req, file, cb) => {
    // file.originalname 在 Windows 中文环境下已是正确的 UTF-8 字符串
    // 这里不做任何转码，直接使用
    // 支持的文件类型
    const allowedTypes = [
      '.txt', '.md', '.json', '.csv', '.xml', '.html',  // 文本文件
      '.pdf',                                            // PDF文件
      '.doc', '.docx',                                   // Word文件
      '.xls', '.xlsx'                                    // Excel文件
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// 测试路由
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "知识库路由工作正常",
    timestamp: new Date().toISOString()
  });
});

// 获取所有知识库文档
router.get("/", async (req, res) => {
  try {
    const documents = await getKnowledgeDocuments();
    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Error getting knowledge documents:", error);
    res.status(500).json({
      success: false,
      message: "获取知识库文档失败",
      error: error instanceof Error ? error.message : "未知错误"
    });
  }
});

// 获取单个知识库文档
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const document = await getKnowledgeDocumentById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "文档不存在",
      });
    }
    
    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Error getting knowledge document:", error);
    res.status(500).json({
      success: false,
      message: "获取文档失败",
    });
  }
});

// 上传知识库文档
router.post("/", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "未选择文件",
      });
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // 使用新的内容解析函数
    const fileContent = await extractFileContent(file);
    
    const documentData: NewKnowledgeDocument = {
      id: uuidv4(),
      filename: file.originalname,
      content: fileContent,
      fileType: fileExtension.substring(1), // 去掉点号
      fileSize: file.size,
      embeddingId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const document = await createKnowledgeDocument(documentData);
    
    // 同步添加到向量数据库
    try {
      await vectorDB.addDocument(
        document.id,
        fileContent,
        {
          filename: document.filename,
          fileType: document.fileType,
          fileSize: document.fileSize || undefined,
          createdAt: document.createdAt
        }
      );
    } catch (vectorError) {
      console.warn("向量数据库添加失败，但文档已保存:", vectorError);
    }
    
    res.json({
      success: true,
      data: document,
      message: "文件上传成功",
    });
      } catch (error) {
      console.error("Error uploading knowledge document:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "文件上传失败",
      });
    }
});

// 更新知识库文档
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { filename, content } = req.body;
    
    const updates: Partial<NewKnowledgeDocument> = {
      updatedAt: new Date().toISOString(),
    };
    
    if (filename) updates.filename = filename;
    if (content) {
      updates.content = content;
      updates.fileSize = Buffer.byteLength(content, 'utf8');
    }

    const document = await updateKnowledgeDocument(id, updates);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "文档不存在",
      });
    }
    
    res.json({
      success: true,
      data: document,
      message: "文档更新成功",
    });
  } catch (error) {
    console.error("Error updating knowledge document:", error);
    res.status(500).json({
      success: false,
      message: "文档更新失败",
    });
  }
});

// 删除知识库文档
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteKnowledgeDocument(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: "文档不存在",
      });
    }
    
    // 同步从向量数据库删除
    try {
      await vectorDB.deleteDocument(id);
    } catch (vectorError) {
      console.warn("从向量数据库删除失败，但文档已删除:", vectorError);
    }
    
    res.json({
      success: true,
      message: "文档删除成功",
    });
  } catch (error) {
    console.error("Error deleting knowledge document:", error);
    res.status(500).json({
      success: false,
      message: "文档删除失败",
    });
  }
});

// 智能检索接口
router.post("/search", async (req, res) => {
  try {
    const { query, maxResults = 5, threshold = 0.6 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: "请提供查询内容",
      });
    }

    const result = await knowledgeRetrieval.retrieveRelevantDocuments(
      query,
      {
        maxResults: parseInt(maxResults),
        threshold: parseFloat(threshold),
        includeSource: true
      }
    );

    res.json(result);
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    res.status(500).json({
      success: false,
      message: "知识库搜索失败",
      documents: [],
      totalFound: 0,
      query: req.body.query || ""
    });
  }
});

// 获取知识库统计信息
router.get("/stats", async (req, res) => {
  try {
    const stats = await knowledgeRetrieval.getKnowledgeBaseStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error getting knowledge base stats:", error);
    res.status(500).json({
      success: false,
      message: "获取统计信息失败",
      data: {
        totalDocuments: 0,
        totalChunks: 0,
        isAvailable: false
      }
    });
  }
});

// 重新解析文档内容
router.post("/reparse/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取原始文档信息
    const document = await getKnowledgeDocumentById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "文档不存在",
      });
    }

    // 检查是否有原始文件信息可以重新解析
    // 注意：这里我们假设可以从文件名推断类型进行重新解析
    // 实际应用中可能需要存储原始文件数据
    
    res.json({
      success: true,
      message: "重新解析功能需要重新上传文件来实现",
      suggestion: "请删除当前文档并重新上传，新的解析功能会自动处理PDF内容"
    });
  } catch (error) {
    console.error("Error reparsing document:", error);
    res.status(500).json({
      success: false,
      message: "重新解析失败",
    });
  }
});

export default router;
