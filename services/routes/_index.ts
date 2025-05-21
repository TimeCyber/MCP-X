import express from "express";
import { chatRouter } from "./chat.js";
import { compatibleRouter } from "./compatible.js";
import { configRouter } from "./config.js";
import { modelVerifyRouter } from "./modelVerify.js";
import { toolsRouter } from "./tools.js";

const OFFLINE_MODE = true

// middleware: restrict access to API methods in ONLINE_MODE
const onlineModeRestriction = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const restrictedPaths = ["/tools", "/config", "/modelVerify"];

  if (!OFFLINE_MODE && req.method !== "GET" && restrictedPaths.some((path) => req.path.startsWith(path))) {
    res.status(403).json({
      success: false,
      message: "This API method is not available",
    });
    return;
  }
  next();
};

export function createRouter() {
  const router = express.Router();

  router.get("/", (req, res) => {
    // if (OFFLINE_MODE) {
    res.render("index");
    // } else {
      // res.json({
        // success: true,
      // });
    // }
  });

  router.use("/api", onlineModeRestriction);

  router.use("/api/tools", toolsRouter());
  router.use("/api/config", configRouter());
  router.use("/api/modelVerify", modelVerifyRouter());
  router.use("/api/v1", compatibleRouter());

  router.use("/api/chat", chatRouter());

  return router;
}
