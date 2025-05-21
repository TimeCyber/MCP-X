import fs from "fs/promises";
import path from "path";
import { ModelInterface } from "../models/interface.js";
import logger from "./logger.js";
import { iModelConfig, ModelSettings } from "./types.js";

// Validate if configuration matches interface definition
function validateModelConfig(config: iModelConfig): boolean {
  try {
    const settings = config.configs?.[config.activeProvider];
    const interfaceDefinition = ModelInterface.model_settings;

    // Check required fields and types
    for (const [key, setting] of Object.entries(interfaceDefinition)) {
      const value = settings[key as keyof ModelSettings];

      // Check required fields
      if (setting.required && value === undefined) {
        logger.error(`Missing required field: ${key}`);
        return false;
      }

      // If value exists, check type
      if (value !== undefined) {
        if (setting.type === "object") {
          if (typeof value !== "object" || value === null) {
            logger.error(`Invalid type for ${key}: expected object, got ${typeof value}`);
            return false;
          }
          // Can add deeper object property validation here
        } else if (typeof value !== setting.type) {
          logger.error(`Invalid type for ${key}: expected ${setting.type}, got ${typeof value}`);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    logger.error("Config validation error:", error);
    return false;
  }
}

// Read model configuration file
export async function loadModelConfig(customPath?: string): Promise<iModelConfig | null> {
  try {
    const configPath = customPath || path.join(process.cwd(), "modelConfig.json");
    const configContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configContent) as iModelConfig;

    // // Validate configuration
    // if (!validateModelConfig(config)) {
    //   logger.error("Invalid model configuration");
    //   return null;
    // }

    return config;
  } catch (error) {
    logger.error("Error loading model configuration:", error);
    return null;
  }
}
