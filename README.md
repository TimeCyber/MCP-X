# MCP-X Agent 🤿 🤖

![GitHub stars](https://img.shields.io/github/stars/TimeCyber/MCP-X?style=social)
![GitHub forks](https://img.shields.io/github/forks/TimeCyber/MCP-X?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/TimeCyber/MCP-X?style=social)
![GitHub repo size](https://img.shields.io/github/repo-size/TimeCyber/MCP-X)
![GitHub language count](https://img.shields.io/github/languages/count/TimeCyber/MCP-X)
![GitHub top language](https://img.shields.io/github/languages/top/TimeCyber/MCP-X)
![GitHub last commit](https://img.shields.io/github/last-commit/TimeCyber/MCP-X?color=red)

MCP-X is an open-source MCP Host Desktop Application that seamlessly integrates with any LLMs supporting function calling capabilities. ✨

![MCP-X Demo](./docs/MCP-XAI.gif)


## Features 🎯

- 🌐 **Universal LLM Support**: Compatible with ChatGPT, Anthropic, Ollama and OpenAI-compatible models
- 💻 **Cross-Platform**: Available for Windows, MacOS, and Linux
- 🔄 **Model Context Protocol**: Enabling seamless MCP AI agent integration on both stdio and SSE mode
- 🌍 **Multi-Language Support**: Traditional Chinese, Simplified Chinese, English, Spanish with more coming soon
- ⚙️ **Advanced API Management**: Multiple API keys and model switching support
- 💡 **Custom Instructions**: Personalized system prompts for tailored AI behavior
- 🔄 **Auto-Update Mechanism**: Automatically checks for and installs the latest application updates

## Download and Install ⬇️

Get the latest version of MCP-X:
[![Download](https://img.shields.io/badge/Download-Latest%20Release-blue.svg)](https://github.com/TimeCyber/MCP-X/releases/latest)

For Windows users: 🪟
- Download the .exe version
- Python and Node.js environments are pre-installed

For MacOS users: 🍎
- Download the .dmg version
- You need to install Python and Node.js (with npx uvx) environments yourself
- Follow the installation prompts to complete setup

For Linux users: 🐧
- Download the .AppImage version
- You need to install Python and Node.js (with npx uvx) environments yourself
- For Ubuntu/Debian users:
  - You may need to add `--no-sandbox` parameter
  - Or modify system settings to allow sandbox
  - Run `chmod +x` to make the AppImage executable

## MCP Tips

While the system comes with a default echo MCP Server, your LLM can access more powerful tools through MCP. Here's how to get started with two beginner-friendly tools: Fetch and Youtube-dl.



### Quick Setup

Add this JSON configuration to your MCP-X MCP settings to enable both tools:

```json
 "mcpServers":{
    "fetch": {
      "command": "uvx",
      "args": [
        "mcp-server-fetch",
        "--ignore-robots-txt"
      ],
      "enabled": true
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/files"
      ],
      "enabled": true
    },
    "youtubedl": {
      "command": "npx",
      "args": [
        "@kevinwatt/yt-dlp-mcp"
      ],
      "enabled": true
    }
  }
```

### Using SSE Server for MCP

You can also connect to an external MCP server via SSE (Server-Sent Events). Add this configuration to your MCP-X MCP settings:

```json
{
  "mcpServers": {
    "MCP_SERVER_NAME": {
      "enabled": true,
      "transport": "sse",
      "url": "YOUR_SSE_SERVER_URL"
    }
  }
}
```

### Additional Setup for yt-dlp-mcp

yt-dlp-mcp requires the yt-dlp package. Install it based on your operating system:

#### Windows
```bash
winget install yt-dlp
```

#### MacOS
```bash
brew install yt-dlp
```

#### Linux
```bash
pip install yt-dlp
```

## Build 🛠️

See [BUILD.md](BUILD.md) for more details.

## Connect With Us 🌐
- 💬 Join our [Discord](https://discord.com/invite/qceMERf4y2)
- 🐦 Follow us on [Twitter/X](https://x.com/MCP-X_ai_agent)
- ⭐ Star us on GitHub
- 🐛 Report issues on our [Issue Tracker](https://github.com/TimeCyber/MCP-X/issues)


