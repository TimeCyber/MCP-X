import express from "express";
import { deleteChat, getAllChats, getChatWithMessages } from "../database/index.js";
import { abortControllerMap } from "../processQuery.js";
import logger from "../utils/logger.js";

export function chatRouter() {
  const router = express.Router();

  router.get("/list", async (req, res) => {
    try {
      const chats = await getAllChats();
      res.json({
        success: true,
        data: chats,
      });
    } catch (error: any) {
      res.json({
        success: false,
        message: error.message,
      });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const chatId = req.params.id;
      const result = await getChatWithMessages(chatId);

      if (!result) {
        res.status(404).json({
          success: false,
          message: "Chat not found",
        });
        return;
      }

      res.json({
        success: true,
        data: {
          chat: result.chat,
          messages: result.messages,
        },
      });
    } catch (error: any) {
      res.json({
        success: false,
        message: error.message,
      });
    }
  });

  router.delete("/:id", async (req, res) => {
    const chatId = req.params.id;
    await deleteChat(chatId);
    res.json({
      success: true,
    });
  });

  router.post("/:id/abort", async (req, res) => {
    logger.info(`[${req.params.id}] Try to abort chat...`);
    try {
      const chatId = req.params.id;
      const controller = abortControllerMap.get(chatId);
      if (controller) {
        logger.info(`[${chatId}] Chat abort signal sent successfully`);
        controller.abort();
        res.json({
          success: true,
          message: "Chat abort signal sent successfully",
        });
      } else {
        logger.info(`[${chatId}] No active chat found with this ID`);
        res.status(404).json({
          success: false,
          message: "No active chat found with this ID",
        });
      }
    } catch (error: any) {
      logger.error(`[${req.params.id}] Error aborting chat`, error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });


  return router;
}
