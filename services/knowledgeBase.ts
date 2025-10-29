import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createKnowledgeDocument } from "./database/index.js";
import { randomUUID } from "crypto";

export class KnowledgeBase {
  private vectorStore: Chroma;

  constructor() {
    this.vectorStore = new Chroma(new OpenAIEmbeddings(), { collectionName: "mcpx_knowledge" });
  }

  async addDocument(filename: string, content: string) {
    const id = randomUUID();
    await this.vectorStore.addDocuments([{ pageContent: content, metadata: { filename } }], { ids: [id] });
    await createKnowledgeDocument({ id, filename, content, embeddingId: id, createdAt: new Date().toISOString() });
  }

  async query(text: string, k: number = 5) {
    return this.vectorStore.similaritySearch(text, k);
  }
}
