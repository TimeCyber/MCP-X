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
