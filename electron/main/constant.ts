import { app } from "electron"
import envPaths from "env-paths"
import os from "os"
import path from "path"

export const envPath = envPaths(app.getName(), { suffix: "" })
export const configDir = envPath.config
export const cacheDir = envPath.cache
export const homeDir = os.homedir()
export const appDir = path.join(homeDir, ".mcpx")
export const scriptsDir = path.join(appDir, "scripts")

export const binDirList = [
  path.join(process.resourcesPath, "node"),
  path.join(process.resourcesPath, "uv"),
  path.join(process.resourcesPath, "python"),
]

export const darwinPathList = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
]

export const DEF_MCP_SERVER_CONFIG = {
  "mcpServers": {
    "echo": {
      "enabled": true,
      "command": "node",
      "args": [
        path.join(scriptsDir, "echo.js")
      ]
    },
    "filesystem": {
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem"
      ],
      "command": "npx"
    },
    "tavily-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "tavily-mcp@0.1.4"
      ],
      "env": {
        "TAVILY_API_KEY": "your-api-key-here"
      },
      "enabled": false,
      "autoApprove": []
    }
  }
}

// 添加网络服务配置
export const NETWORK_CONFIG = {
  // 禁用自动重试，避免无限循环
  DISABLE_AUTO_RETRY: process.env.DISABLE_AUTO_RETRY === "true" || false,
  // 最大重试次数
  MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS || "3"),
  // 重试延迟（毫秒）
  RETRY_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS || "2000"),
  // 网络请求超时时间（毫秒）
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || "5000"),
  // 禁用智能体同步
  DISABLE_AGENT_SYNC: process.env.DISABLE_AGENT_SYNC === "true" || false,
  // 禁用MCP服务器自动重连
  DISABLE_MCP_AUTO_RECONNECT: process.env.DISABLE_MCP_AUTO_RECONNECT === "true" || false,
}
