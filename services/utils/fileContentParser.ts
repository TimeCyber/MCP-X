import * as fs from 'fs';
import * as path from 'path';
import logger from './logger.js';

// 动态导入避免启动时错误
async function parseExcelFile(filePath: string): Promise<string> {
  try {
    const XLSXModule = await import('xlsx');
    const XLSX = (XLSXModule as any).default ?? XLSXModule; // 兼容 ESM/CJS
    const workbook = XLSX.readFile(filePath);
    
    let content = '';
    (workbook.SheetNames as string[]).forEach((sheetName: string, index: number) => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      content += `\n=== 工作表 ${index + 1}: ${sheetName} ===\n`;
      
      // 限制显示行数，避免内容过长
      const displayRows = Math.min(data.length, 100);
      
      if (Array.isArray(data) && data.length > 0) {
        for (let i = 0; i < displayRows; i++) {
          const row = data[i] as any[];
          if (row && row.length > 0) {
            content += row.join('\t') + '\n';
          }
        }
        
        if (data.length > displayRows) {
          content += `\n... (共 ${data.length} 行，只显示前 ${displayRows} 行)\n`;
        }
      }
    });
    
    return content || '未能解析Excel文件内容';
  } catch (error) {
    logger.error('解析Excel文件失败:', error);
    return `Excel文件解析失败: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function parsePDFFile(filePath: string): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse.default(dataBuffer);
    
    return `PDF文档内容 (共 ${data.numpages} 页):\n\n${data.text}`;
  } catch (error) {
    logger.error('解析PDF文件失败:', error);
    return `PDF文件解析失败: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function parseWordFile(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const dataBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    
    return `Word文档内容:\n\n${result.value}`;
  } catch (error) {
    logger.error('解析Word文件失败:', error);
    return `Word文件解析失败: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function parseCSVFile(filePath: string): Promise<string> {
  try {
    const csvParser = await import('csv-parser');
    const results: any[] = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser.default())
        .on('data', (data) => {
          results.push(data);
          // 限制行数，避免内容过长
          if (results.length >= 1000) {
            return;
          }
        })
        .on('end', () => {
          if (results.length === 0) {
            resolve('CSV文件为空或格式错误');
            return;
          }
          
          let content = 'CSV文件内容:\n\n';
          
          // 添加列标题
          const headers = Object.keys(results[0]);
          content += headers.join('\t') + '\n';
          content += '-'.repeat(headers.join('\t').length) + '\n';
          
          // 添加数据行
          const displayRows = Math.min(results.length, 1000);
          for (let i = 0; i < displayRows; i++) {
            const row = results[i];
            content += headers.map(header => row[header] || '').join('\t') + '\n';
          }
          
          if (results.length > displayRows) {
            content += `\n... (共 ${results.length} 行，只显示前 ${displayRows} 行)\n`;
          }
          
          resolve(content);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  } catch (error) {
    logger.error('解析CSV文件失败:', error);
    return `CSV文件解析失败: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function parseTextFile(filePath: string): Promise<string> {
  try {
    // 尝试不同的编码
    const encodings = ['utf8', 'utf16le', 'latin1'];
    
    for (const encoding of encodings) {
      try {
        const content = fs.readFileSync(filePath, encoding as BufferEncoding);
        if (content && content.trim()) {
          return `文本文件内容 (${encoding} 编码):\n\n${content}`;
        }
      } catch (e) {
        // 继续尝试下一个编码
      }
    }
    
    return '无法读取文本文件内容，可能是编码问题';
  } catch (error) {
    logger.error('解析文本文件失败:', error);
    return `文本文件解析失败: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function parseImageWithOCR(filePath: string): Promise<string> {
  try {
    const tesseract = await import('tesseract.js');
    const { data: { text } } = await tesseract.recognize(
      filePath,
      'chi_sim+eng', // 支持中英文识别
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR进度: ${(m.progress * 100).toFixed(1)}%`);
          }
        }
      }
    );
    
    return text.trim() ? `图片OCR识别结果:\n\n${text}` : '图片中未识别到文字内容';
  } catch (error) {
    logger.error('图片OCR识别失败:', error);
    return `图片文字识别失败: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function parseFileContent(filePath: string): Promise<string> {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return `文件不存在: ${filePath}`;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    logger.info(`开始解析文件: ${fileName} (${ext})`);
    
    switch (ext) {
      case '.xlsx':
      case '.xls':
        return await parseExcelFile(filePath);
        
      case '.pdf':
        return await parsePDFFile(filePath);
        
      case '.docx':
        return await parseWordFile(filePath);
        
      case '.csv':
        return await parseCSVFile(filePath);
        
      case '.txt':
      case '.md':
      case '.log':
        return await parseTextFile(filePath);
        
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.bmp':
      case '.webp':
        return await parseImageWithOCR(filePath);
        
      default:
        return `不支持的文件格式: ${ext}`;
    }
    
  } catch (error) {
    logger.error(`解析文件失败 ${filePath}:`, error);
    return `文件解析失败: ${error instanceof Error ? error.message : String(error)}`;
  }
} 