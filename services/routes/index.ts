import express from "express";
import { chatRouter } from "./chat.js";
import { configRouter } from "./config.js";
import { toolsRouter } from "./tools.js";
import knowledgeRouter from "./knowledge.js";

export function createRouter() {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.render("index");
  });

  router.use("/api/tools", toolsRouter());
  router.use("/api/config", configRouter());
  router.use("/api/chat", chatRouter());
  router.use("/api/knowledge", knowledgeRouter);

  return router;
}
