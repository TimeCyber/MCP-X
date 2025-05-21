import { ToolDefinition } from "@langchain/core/language_models/base";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import logger from "./logger.js";
import { iConfig } from "./types.js";

export function convertToOpenAITools(tools: Tool[]): ToolDefinition[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: { ...tool.inputSchema, additionalProperties: false },
    },
  }));
}

// Specialized tool conversion function for Gemini API
export function openAIConvertToGeminiTools(tools: ToolDefinition[]): ToolDefinition[] {
  logger.debug(`[openAIConvertToGeminiTools]`);
  return tools.map((tool) => {
    // Get basic tool information
    const name = tool.function?.name || "";
    const description = tool.function?.description || "";

    // Build simplified parameters that Gemini supports
    const simplifiedParameters = buildGeminiParameters(tool.function?.parameters);

    // Return tool definition in Gemini format
    return {
      type: "function" as const,
      function: {
        name,
        description,
        parameters: simplifiedParameters,
      },
    };
  });
}

// Build parameter structure supported by Gemini
function buildGeminiParameters(originalParams: any): any {
  // Handle empty parameters case
  if (!originalParams) {
    return {
      type: "OBJECT",
      properties: { dummy: { type: "STRING" } },
      required: [],
    };
  }

  const geminiParams: any = {
    type: "OBJECT",
    properties: {},
  };

  // Copy required fields (if they exist)
  if (originalParams.required && Array.isArray(originalParams.required)) {
    geminiParams.required = [...originalParams.required];
  }

  // Process properties
  processProperties(originalParams, geminiParams);

  // Ensure properties are not empty (Gemini requirement)
  if (Object.keys(geminiParams.properties).length === 0) {
    geminiParams.properties = { dummy: { type: "STRING" } };
  }

  return geminiParams;
}

// Process properties for parameters
function processProperties(originalParams: any, geminiParams: any): void {
  if (!originalParams.properties) return;

  for (const [propName, propValue] of Object.entries<any>(originalParams.properties)) {
    // Add the processed property to the parameters object
    geminiParams.properties[propName] = buildSimplifiedProperty(propValue);
  }
}

// Used to build simplified properties
function buildSimplifiedProperty(propValue: any): any {
  const simpleProp: any = {};

  // Determine and set the appropriate type
  simpleProp.type = determinePropertyType(propValue);

  // Add properties for object type
  if (simpleProp.type === "OBJECT") {
    simpleProp.properties = getObjectProperties(propValue);
  }

  // Copy description
  if (propValue.description) {
    simpleProp.description = propValue.description;
  }

  // Process enum
  if (propValue.enum && Array.isArray(propValue.enum)) {
    simpleProp.enum = propValue.enum.map((val: string) => (val === "" ? "none" : val));
  }

  // Process items (if array)
  if (simpleProp.type === "ARRAY" && propValue.items) {
    simpleProp.items = buildSimplifiedProperty(propValue.items);
  }

  return simpleProp;
}

// Determine property type based on various input formats
function determinePropertyType(propValue: any): string {
  // Case 1: Direct type specified as string
  if (propValue.type && typeof propValue.type === "string") {
    return convertTypeToGeminiFormat(propValue.type);
  }

  // Case 2: Type specified as array
  if (propValue.type && Array.isArray(propValue.type) && propValue.type.length > 0) {
    return convertTypeToGeminiFormat(propValue.type[0]);
  }

  // Case 3: Type specified in all_of structure
  if (propValue.all_of) {
    const typeItem = propValue.all_of.find((item: any) => item.type);
    if (typeItem && typeItem.type) {
      if (typeof typeItem.type === "string") {
        return convertTypeToGeminiFormat(typeItem.type);
      }
      if (Array.isArray(typeItem.type) && typeItem.type.length > 0) {
        return convertTypeToGeminiFormat(typeItem.type[0]);
      }
    }
  }

  // Default case: use STRING type
  return "STRING";
}

// Get properties for OBJECT type
function getObjectProperties(propValue: any): any {
  // Case 1: No properties or empty properties
  if (!propValue.properties || Object.keys(propValue.properties).length === 0) {
    return { dummy: { type: "STRING" } };
  }

  // Case 2: Has properties - process them recursively
  const processedProperties: any = {};
  for (const [subPropName, subPropValue] of Object.entries<any>(propValue.properties)) {
    processedProperties[subPropName] = buildSimplifiedProperty(subPropValue);
  }

  // If processed properties are empty, provide a dummy property
  if (Object.keys(processedProperties).length === 0) {
    return { dummy: { type: "STRING" } };
  }

  return processedProperties;
}

// Convert OpenAI format type to Gemini format
function convertTypeToGeminiFormat(type: string): string {
  // Type mapping table
  const typeMap: Record<string, string> = {
    string: "STRING",
    number: "NUMBER",
    integer: "INTEGER",
    boolean: "BOOLEAN",
    array: "ARRAY",
    object: "OBJECT",
  };

  // If the type is already uppercase or not in the mapping, keep it as is
  return typeMap[type.toLowerCase()] || type;
}

// Read configuration file
export async function loadConfig(customPath?: string): Promise<iConfig> {
  try {
    const configPath = customPath || path.join(process.cwd(), "config.json");
    const configContent = await fs.readFile(configPath, "utf-8");
    return JSON.parse(configContent);
  } catch (error) {
    return { mcpServers: {} };
  }
}

// List all available servers
export async function loadConfigAndServers(customPath?: string): Promise<{ config: iConfig; servers: string[] }> {
  const config = await loadConfig(customPath);
  return { config, servers: Object.keys(config.mcpServers) };
}
