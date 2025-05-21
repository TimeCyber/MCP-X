import dotenv from "dotenv";
import { MCPCliClient } from "./client.js";
import logger from "./utils/logger.js";
import { DatabaseMode, initDatabase } from "./database/index.js";
import { SystemCommandManager } from "./syscmd/index.js";

dotenv.config();

// Main execution logic
async function main() {
  let client: MCPCliClient | null = null;

  logger.info(`[Server Start Info]--------------------------------`);
    logger.info(`[Offline Mode]: ${process.env.OFFLINE_MODE === "true"}`);
    process.env.OFFLINE_MODE === "true" && logger.info(`[File Upload]: Local-Filepath or Upload-File are supported`);
    process.env.OFFLINE_MODE !== "true" && logger.info(`[File Upload]: Not supported on ONLINE MODE currently`);
    logger.info(`[Database Mode]: ${process.env.DATABASE_MODE}`);

    process.env.DATABASE_MODE?.toLocaleLowerCase() === DatabaseMode.DIRECT &&
      logger.info(`[Database Local Path]: ${process.env.DATABASE_LOCAL_PATH}`);

    process.env.DATABASE_MODE?.toLocaleLowerCase() === DatabaseMode.API &&
      logger.info(`[Database API URL]: ${process.env.DATABASE_API_URL}`);
  logger.info(`[Server Start Info]--------------------------------`);

  try {
    const systemCommandManager = SystemCommandManager.getInstance();
    systemCommandManager.initialize({
      node: process.execPath,
    });

    client = new MCPCliClient();
    await client.init();

    initDatabase(
      process.env.DATABASE_MODE?.toLowerCase() === DatabaseMode.API ? DatabaseMode.API : DatabaseMode.DIRECT,
      {
        dbPath: process.env.DATABASE_LOCAL_PATH,
        apiUrl: process.env.DATABASE_API_URL,
      }
    );

    // Create and start Web server
    const { WebServer } = await import("./webServer.js");
    const webServer = new WebServer(client);
    await webServer.start(4321);

    // Keep command line interface
    await client.chatLoop();
  } catch (error) {
    logger.error("Error:", error);
    await client?.cleanup();
    process.exit(1);
  }
}

main();
