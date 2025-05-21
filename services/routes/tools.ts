import express from "express";
import { MCPServerManager } from "../mcpServer/index.js";

export function toolsRouter() {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      const tools = MCPServerManager.getInstance().getToolInfos();
      res.json({
        success: true,
        tools: tools,
      });
    } catch (error: any) {
      res.json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
}
