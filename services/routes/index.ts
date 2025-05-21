import express from "express";
import { chatRouter } from "./chat.js";
import { configRouter } from "./config.js";
import { toolsRouter } from "./tools.js";

export function createRouter() {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.render("index");
  });

  router.use("/api/tools", toolsRouter());
  router.use("/api/config", configRouter());
  router.use("/api/chat", chatRouter());

  return router;
}
