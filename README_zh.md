# MCP-X Agent 🤿 🤖

[English](README.md) | [中文](README_zh.md)

![GitHub stars](https://img.shields.io/github/stars/TimeCyber/MCP-X?style=social)
![GitHub forks](https://img.shields.io/github/forks/TimeCyber/MCP-X?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/TimeCyber/MCP-X?style=social)
![GitHub repo size](https://img.shields.io/github/repo-size/TimeCyber/MCP-X)
![GitHub language count](https://img.shields.io/github/languages/count/TimeCyber/MCP-X)
![GitHub top language](https://img.shields.io/github/languages/top/TimeCyber/MCP-X)
![GitHub last commit](https://img.shields.io/github/last-commit/TimeCyber/MCP-X?color=red)

MCP-X 是一个开源的 MCP Client 桌面应用，能够无缝集成所有支持 function calling 能力的大模型（LLMs）。✨

![MCP-X Demo](./docs/MCP-XAI.gif)

## 使用案例 🎯

### AI 智能内容分析
MCP-X 擅长通过强大的 AI 代理分析和理解各种类型的内容。以下是美食内容分析的示例：

![美食分析示例](./docs/food-analysis-example.png)

**展示的核心功能：**
- 🍽️ **美食内容分析**：详细解析菜品、食材和营养信息
- 🎯 **精准推荐**：基于用户偏好的个性化建议
- 📊 **结构化输出**：组织清晰的信息分类展示
- 💬 **交互式对话**：自然流畅的对话体验和全面回应

**适用场景：**
- 美食博主和内容创作者
- 营养师和健康专业人士
- 餐厅老板和厨师
- 任何对美食分析和推荐感兴趣的人

这展示了 MCP-X 如何将简单的查询转化为详细、可操作的洞察，适用于各个领域。

## 最新亮点

我们推出了两项重大更新，旨在提升您的使用体验：

### 🚀 全新智能体系统
MCP-X 现已成为一个完整的智能体平台。
- **新增智能体侧边栏**: 在这里发现、管理和搜索不同领域的专业AI智能体。
- **一键对话**: 根据当前任务，随时切换和对话所需智能体。
- **智能体详情**: 查看每个智能体的具体能力、技能和使用示例。
- **清晰分类**: 智能体已按内容创作、数据分析、编程等类别进行整理。

### 🎨 焕然一新的界面
我们重新设计了应用界面，使其更简洁、更直观。
- **全新侧边导航**: 新的导航栏让您可以快速访问对话、智能体、工具、模型和系统设置。
- **更清晰的图标**: 导航图标增加了文字说明，功能一目了然。
- **统一的设计风格**: 我们统一了配色和布局，使整体观感更加协调、专业。

此次更新还包括将图标库升级为更专业的 `react-icons`，并对底层的CSS和组件进行了多项优化，以提升性能。

## 功能特性 🎯

- 🌐 **通用大模型支持**：兼容 ChatGPT、Anthropic、Ollama 及所有 OpenAI 兼容模型
- 💻 **跨平台**：支持 Windows、MacOS 和 Linux
- 🔄 **模型上下文协议**：支持 stdio 和 SSE 模式下的 MCP AI agent 无缝集成
- 🌍 **多语言支持**：支持繁体中文、简体中文、英文、西班牙语，更多语言即将上线
- ⚙️ **高级 API 管理**：支持多 API Key 和模型切换
- 💡 **自定义指令**：可个性化系统提示词，定制 AI 行为
- 🔄 **自动更新机制**：自动检测并安装最新应用版本

## 下载与安装 ⬇️

获取 MCP-X 最新版本：
[![Download](https://img.shields.io/badge/Download-Latest%20Release-blue.svg)](https://github.com/TimeCyber/MCP-X/releases/latest)

Windows 用户：🪟
- 下载 .exe 版本
- 已内置 Python 和 Node.js 环境

MacOS 用户：🍎
- 下载 .dmg 版本
- 需自行安装 Python 和 Node.js（含 npx uvx）环境
- 按照安装提示完成设置

Linux 用户：🐧
- 下载 .AppImage 版本
- 需自行安装 Python 和 Node.js（含 npx uvx）环境
- Ubuntu/Debian 用户：
  - 可能需要添加 `--no-sandbox` 参数
  - 或修改系统设置以允许沙盒
  - 运行 `chmod +x` 赋予 AppImage 可执行权限

## MCP 小贴士

系统自带默认的 echo MCP Server，你的大模型可以通过 MCP 访问更强大的工具。以下是两个新手友好工具的快速上手方法：Fetch 和 Youtube-dl。

### 快速配置

将以下 JSON 配置添加到 MCP-X 的 MCP 设置中以启用这两个工具：

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

### 使用 SSE 服务器作为 MCP

你也可以通过 SSE（Server-Sent Events）连接外部 MCP 服务器。将如下配置添加到 MCP-X 的 MCP 设置中：

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

## 构建 🛠️

详见 [BUILD.md](BUILD.md)。

## 联系我们 🌐
- 💬 官方网站 [MCP-X](https://mcp-x.com/)
- 🐦 关注我们的 [小红书](https://www.xiaohongshu.com/user/profile/6833b89f000000000e0137ca)
- ⭐ GitHub 点 Star
- 🐛 在 [Issue Tracker](https://github.com/TimeCyber/MCP-X/issues) 提交问题 