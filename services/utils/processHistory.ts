import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Message } from "../database/schema.js";
import { imageToBase64 } from "./image.js";

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
      if (message.content) {
        content.push({
          type: "text",
          text: message.content,
        });
      }

      for (const filePath of files) {
        const localPath = `${filePath}`;
        if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const base64Image = await imageToBase64(localPath);
          content.push({
            type: "text",
            text: `![Image](${localPath})`,
          });
          content.push({
            type: "image_url",
            image_url: {
              url: base64Image,
            },
          });
        } else {
          content.push({
            type: "text",
            text: `![Document](${localPath})`,
          });
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
