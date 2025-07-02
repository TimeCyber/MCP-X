import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Message } from "../database/schema.js";
import { imageToBase64 } from "./image.js";
import { parseFileContent } from "./fileContentParser.js";

export async function processHistoryMessages(historyMessages: Message[], history: BaseMessage[]) {
  for (const message of historyMessages) {
    const files = message.files as string[];
    if (!files || files.length === 0) {
      // Handle empty content
      const messageContent = message.content?.trim() ? message.content : ".";
      if (message.role === "user") {
        history.push(new HumanMessage(messageContent));
      } else {
        history.push(new AIMessage(messageContent));
      }
    } else {
      let content: any[] = [];
      
      // Add text content if exists
      if (message.content) {
        content.push({
          type: "text",
          text: message.content,
        });
      }

      // Process files
      for (const filePath of files) {
        const localPath = `${filePath}`;
        
        if (filePath.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
          // Handle image files: both base64 for vision and OCR text
          const base64Image = await imageToBase64(localPath);
          
          // Add image for vision models
          content.push({
            type: "image_url",
            image_url: {
              url: base64Image,
            },
          });
          
          // Also add OCR text content
          try {
            const ocrText = await parseFileContent(localPath);
            if (ocrText && !ocrText.includes('失败')) {
              content.push({
                type: "text",
                text: `\n[图片文件: ${localPath}]\n${ocrText}`,
              });
            }
          } catch (error) {
            // OCR failed, just use image
            content.push({
              type: "text",
              text: `[图片文件: ${localPath}]`,
            });
          }
        } else {
          // Handle document files: parse content
          try {
            const fileContent = await parseFileContent(localPath);
            content.push({
              type: "text",
              text: `\n[文档文件: ${localPath}]\n${fileContent}`,
            });
          } catch (error) {
            content.push({
              type: "text",
              text: `[文档文件: ${localPath}] - 解析失败`,
            });
          }
        }
      }

      if (message.role === "assistant") {
        history.push(new AIMessage({
            content: content,
        }));
      } else {
        history.push(new HumanMessage({
            content: content,
        }));
      }
    }
  }

  return history;
}
