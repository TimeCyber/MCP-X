import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Message } from "../../database/schema.js";
import { imageToBase64 } from "../../utils/image.js";
import { processHistoryMessages } from "../../utils/processHistory.js";

jest.mock("../../utils/image.js");

describe("processHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (imageToBase64 as jest.Mock).mockResolvedValue("data:image/jpeg;base64,mockBase64");
  });

  describe("processHistoryMessages", () => {
    it("should correctly process plain text messages", async () => {
      const mockMessages: Message[] = [
        {
          id: 1,
          chatId: "chat1",
          messageId: "1",
          role: "user",
          content: "Hello",
          files: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          role: "assistant",
          content: "Hi there",
          files: [],
          messageId: "2",
          chatId: "chat1",
          createdAt: new Date().toISOString(),
        },
      ];

      const history: BaseMessage[] = [];
      const result = await processHistoryMessages(mockMessages, history);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(HumanMessage);
      expect(result[1]).toBeInstanceOf(AIMessage);
      expect((result[0] as HumanMessage).content).toBe("Hello");
      expect((result[1] as AIMessage).content).toBe("Hi there");
    });

    it("should correctly process messages with images", async () => {
      const mockMessages: Message[] = [
        {
          id: 1,
          role: "user",
          content: "Check this image",
          files: ["test.jpg"],
          messageId: "1",
          chatId: "chat1",
          createdAt: new Date().toISOString(),
        },
      ];

      const history: BaseMessage[] = [];
      const result = await processHistoryMessages(mockMessages, history);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(HumanMessage);
      const content = (result[0] as HumanMessage).content as any[];
      expect(content).toHaveLength(3); // text + image markdown + image base64
      expect(content[0]).toEqual({ type: "text", text: "Check this image" });
      expect(content[1]).toEqual({ type: "text", text: "![Image](test.jpg)" });
      expect(content[2]).toEqual({
        type: "image_url",
        image_url: { url: "data:image/jpeg;base64,mockBase64" },
      });
    });

    it("should correctly process messages with documents", async () => {
      const mockMessages: Message[] = [
        {
          id: 1,
          role: "user",
          content: "Check this document",
          files: ["test.pdf"],
          messageId: "1",
          chatId: "chat1",
          createdAt: new Date().toISOString(),
        },
      ];

      const history: BaseMessage[] = [];
      const result = await processHistoryMessages(mockMessages, history);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(HumanMessage);
      const content = (result[0] as HumanMessage).content as any[];
      expect(content).toHaveLength(2); // text + document markdown
      expect(content[0]).toEqual({ type: "text", text: "Check this document" });
      expect(content[1]).toEqual({
        type: "text",
        text: "![Document](test.pdf)",
      });
    });

    it("should correctly process messages with mixed content", async () => {
      const mockMessages: Message[] = [
        {
          id: 1,
          role: "user",
          content: "Mixed content",
          files: ["test.jpg", "test.pdf"],
          messageId: "1",
          chatId: "chat1",
          createdAt: new Date().toISOString(),
        },
      ];

      const history: BaseMessage[] = [];
      const result = await processHistoryMessages(mockMessages, history);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(HumanMessage);
      const content = (result[0] as HumanMessage).content as any[];
      expect(content).toHaveLength(4); // text + image markdown + image base64 + document markdown
      expect(content[0]).toEqual({ type: "text", text: "Mixed content" });
      expect(content[1]).toEqual({ type: "text", text: "![Image](test.jpg)" });
      expect(content[2]).toEqual({
        type: "image_url",
        image_url: { url: "data:image/jpeg;base64,mockBase64" },
      });
      expect(content[3]).toEqual({
        type: "text",
        text: "![Document](test.pdf)",
      });
    });

    it("should correctly process messages without content", async () => {
      const mockMessages: Message[] = [
        {
          id: 1,
          role: "user",
          content: "",
          files: [],
          messageId: "1",
          chatId: "chat1",
          createdAt: new Date().toISOString(),
        },
      ];

      const history: BaseMessage[] = [];
      const result = await processHistoryMessages(mockMessages, history);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(HumanMessage);
      expect((result[0] as HumanMessage).content).toBe("");
    });
  });
});
