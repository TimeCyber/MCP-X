## Table of Contents Build mcpx

- [Development Requirements](#development-requirements)
- [Development](#development)
  - [Install dependencies](#install-dependencies)
  - [Start development server](#start-development-server)
- [Build for production](#build-for-production)
  - [Cross-platform Build for Windows](#cross-platform-build-for-windows)
- [Scripts](#scripts)
- [Package Scripts](#package-scripts)
- [MCP Server Setup](#mcp-server-setup)
  - [1. Add New MCP Server via GUI](#1-add-new-mcp-server-via-gui)
  - [2. Edit config.json directly](#2-edit-configjson-directly)
  - [3. Using Config Editor](#3-using-config-editor)
  - [4. Custom Scripts](#4-custom-scripts)
- [Project Architecture](#project-architecture)

## Development Requirements

- Node.js LTS+

## Development

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev:electron
```

## Build for production

```bash
npm run package
```

### Cross-platform Build for Windows

If you are on macOS or Linux and want to build for Windows:

1. Download Windows binaries
```bash
npm run download:windows-bin
```

2. Build using Docker
```bash
./scripts/docker/build-win.sh
```

## Scripts

- `dev` - Start Vite development server
- `dev:electron` - Start Electron development server
- `build` - Build web assets
- `build:electron` - Build Electron application
- `download:windows-bin` - Download Windows binaries for cross-platform build

## Package Scripts

- `package` - Create application directory
- `package:windows` - Create Windows distributable package
- `package:linux` - Create Linux distributable package
- `docker:build-win` - Build Windows version using Docker

## MCP Server Setup

After first launch, you can find the `config.json` file in these locations:

- macOS: `~/Library/Preferences/mcpx`
- Windows: `C:\Users\USERNAME\AppData\Local\MCPX\Data`
- Linux: `~/.config/mcpx`

There are four ways to configure MCP servers:

### 1. Add New MCP Server via GUI

1. Click the menu button in the top-left corner to open the sidebar
2. Click "MCP Server Management" at the bottom
3. Click the "Add MCP Server" button
4. Paste your MCP server configuration in JSON format
5. Click "Save" to add the new server

Example configuration:
```json
{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

### 2. Edit config.json directly

You can edit the `config.json` file directly in the above locations following each MCP server's documentation.

### 3. Using Config Editor

1. Click the menu button in the top-left corner to open the sidebar
2. Click "MCP Server Management" at the bottom
3. Click the "Edit Config" button on the page

### 4. Custom Scripts

You can add your own MCP server scripts in the `.mcpx/scripts` directory in your home folder, then update the `config.json` accordingly.

Example:

1. Create a new file `echo.js` in `~/.mcpx/scripts`
2. Update `config.json`:

```json
{
  "mcpServers": {
    "echo": {
      "enabled": true,
      "command": "node",
      "args": [
        "echo.js"
      ]
    }
  }
}
```

## Project Architecture

```
src/
├── atoms/              # Global state management
│   ├── configState.ts    # Model configuration state
│   ├── interfaceState.ts # UI interface state
│   └── historyState.ts   # Chat history state
│
├── components/         # Reusable UI components
│   ├── ModelConfigForm  # Model settings form
│   ├── Toast           # Toast notifications
│   └── Header          # App header
│
├── views/             # Page components
│   ├── Chat/           # Chat interface
│   ├── Setup/          # Initial setup
│   └── Welcome/        # Welcome page
│
├── styles/            # SCSS stylesheets
│   ├── components/     # Component styles
│   └── pages/         # Page-specific styles
│
└── hooks/             # Custom React hooks

electron/
├── main/             # Main process
│   └── index.ts       # Main entry
└── preload/          # Preload scripts
    └── index.ts       # Bridge between main and renderer

services/            # Backend services
```

# macOS 打包说明

## 代码签名和公证要求

在 macOS 上打包应用时，需要进行代码签名和公证以避免应用被标记为禁用。

### 环境变量设置

打包前需要设置以下环境变量：

```bash
export APPLETEAMID="你的Apple开发者团队ID"
export APPLEID="你的Apple ID"
export APPLEIDPASS="你的Apple ID应用专用密码"
```

### 获取必要信息

1. **Apple 开发者团队 ID**：
   - 登录 [Apple Developer](https://developer.apple.com/)
   - 在 Membership 页面查看 Team ID

2. **应用专用密码**：
   - 登录 [Apple ID 管理页面](https://appleid.apple.com/)
   - 在"登录和安全"部分生成应用专用密码

### 打包命令

```bash
# 设置环境变量
export APPLETEAMID="你的团队ID"
export APPLEID="你的Apple ID"
export APPLEIDPASS="你的应用专用密码"

# 打包
npm run build:mac
```

### 用户临时使用未签名应用的方法

如果应用显示禁用标识，用户可以通过以下方法临时使用：

#### 方法一：右键打开（推荐）
1. 右键点击应用图标
2. 选择"打开"
3. 在警告对话框中点击"打开"

#### 方法二：系统偏好设置
1. 打开"系统偏好设置" → "安全性与隐私"
2. 在"通用"选项卡中找到被阻止的应用
3. 点击"仍要打开"按钮

#### 方法三：终端命令
```bash
# 移除隔离属性
sudo xattr -r -d com.apple.quarantine /Applications/MCP-X.app

# 或者临时禁用 Gatekeeper（不推荐）
sudo spctl --master-disable
```

#### 方法四：开发者模式（macOS 13+）
1. 打开"系统偏好设置" → "隐私与安全性"
2. 向下滚动找到"开发者工具"
3. 启用"允许来自任何来源的应用程序"

### 本地打包脚本

为了简化本地打包流程，可以使用提供的脚本：

```bash
# 给脚本执行权限
chmod +x scripts/build-mac-local.sh

# 运行打包脚本
./scripts/build-mac-local.sh
```

### 证书安装步骤

1. **获取开发者证书**：
   - 登录 [Apple Developer](https://developer.apple.com/)
   - 创建 "Developer ID Application" 证书
   - 下载 `.p12` 证书文件

2. **安装证书**：
   - 双击 `.p12` 文件
   - 输入密码并安装到"登录"钥匙串
   - 在钥匙串访问中确认证书已安装

3. **验证证书**：
   ```bash
   security find-identity -v -p codesigning
   ```

### 常见问题

1. **"Mac不支持此类应用程序"错误**：
   - 原因：缺少有效的代码签名证书
   - 解决：安装 Apple 开发者证书并正确配置

2. **应用显示禁用标识**：
   - 检查环境变量是否正确设置
   - 确认 Apple 开发者账号有效
   - 检查公证过程是否成功

3. **权限问题**：
   - 某些权限可能被 Apple 标记为危险
   - 建议只保留必要的权限

4. **Gatekeeper 问题**：
   - 可以临时设置 `"gatekeeperAssess": false`
   - 但建议通过正确的签名和公证来解决

5. **证书过期**：
   - 开发者证书有效期为1年
   - 需要定期更新证书
