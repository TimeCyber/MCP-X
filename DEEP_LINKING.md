# MCP-X Deep Linking 功能说明

## 概述

MCP-X 现在支持自定义URL协议（Deep Linking）功能，允许通过特定的URL直接跳转到应用内的特定Agent页面。

## 协议格式

自定义协议：`mcp-x://`

URL格式：`mcp-x://agent/{agentId}`

例如：
- `mcp-x://agent/1` - 跳转到ID为1的Agent
- `mcp-x://agent/123` - 跳转到ID为123的Agent

## 功能特性

### 1. 协议注册
- **协议名称**: `mcp-x`
- **支持平台**: Windows、macOS、Linux
- **自动注册**: 应用启动时自动注册为默认协议处理程序

### 2. 启动处理
- **应用未运行**: 通过Deep Link启动应用时，会自动创建窗口并导航到指定的Agent页面
- **应用已运行**: 如果应用在后台运行，会聚焦到现有窗口并导航到新的Agent页面
- **单例模式**: 确保只有一个应用实例运行

### 3. 错误处理
- **无效Agent ID**: 如果指定的Agent不存在，会显示相应的错误信息
- **URL解析错误**: 对无效的URL格式进行容错处理
- **超时处理**: 设置合理的延迟确保应用完全加载后再处理Deep Link

## 实现细节

### 主进程 (Electron)

1. **协议注册**:
```typescript
app.setAsDefaultProtocolClient('mcp-x')
```

2. **URL处理**:
- `app.on('open-url', ...)` - macOS专用
- `app.on('second-instance', ...)` - Windows/Linux处理已运行实例
- `process.argv` - 处理启动参数中的URL

3. **IPC通信**:
```typescript
win.webContents.send('open-agent-detail', agentId)
```

### 渲染进程 (React)

1. **事件监听**:
```typescript
window.ipcRenderer.on('open-agent-detail', handleOpenAgentDetail)
```

2. **路由导航**:
```typescript
window.location.hash = `/agent/${agentId}`
```

3. **Agent选择**:
- 自动加载Agent列表（如果未加载）
- 选择指定ID的Agent
- 更新UI状态

## 测试方法

### 1. 开发环境测试

在Welcome页面中包含了Deep Linking测试区域：
- 点击测试按钮复制Deep Link到剪贴板
- 在外部应用（如浏览器地址栏、运行对话框）中粘贴并执行

### 2. 生产环境测试

1. **构建应用**:
```bash
npm run build
npm run build:electron
```

2. **安装应用后测试**:
- Windows: 在运行对话框 (Win+R) 中输入 `mcp-x://agent/123`
- macOS: 在终端中执行 `open "mcp-x://agent/123"`
- Linux: 在应用启动器中输入URL

### 3. 浏览器测试

在任何支持自定义协议的浏览器中：
1. 在地址栏输入: `mcp-x://agent/123`
2. 浏览器会提示是否打开MCP-X应用
3. 确认后应用会启动并导航到指定Agent

## 配置说明

### electron-builder配置

已在 `electron-builder.json` 中添加了协议配置：

```json
{
  "protocols": [
    {
      "name": "MCP-X Protocol",
      "schemes": ["mcp-x"]
    }
  ]
}
```

### macOS专用配置

在 `extendInfo` 中添加了 `CFBundleURLTypes` 配置，确保macOS正确识别协议。

## 使用场景

1. **外部集成**: 其他应用可以通过Deep Link直接跳转到特定Agent
2. **书签功能**: 用户可以保存特定Agent的深度链接
3. **分享功能**: 可以分享Agent链接给其他用户
4. **工作流自动化**: 结合脚本或工作流工具自动打开特定Agent

## 注意事项

1. **安全性**: Deep Link中的Agent ID会被验证，无效ID不会导致应用崩溃
2. **性能**: 使用了延迟处理机制，确保应用完全加载后再处理Deep Link
3. **兼容性**: 支持开发环境和生产环境，在不同操作系统上行为一致
4. **用户体验**: 已运行的应用会聚焦到前台，避免创建多个实例

## 故障排除

### Deep Link不工作
1. 确认应用已正确安装并运行过至少一次
2. 检查操作系统是否正确注册了协议
3. 在开发环境中，确认应用正在运行

### Agent页面不加载
1. 确认Agent ID是有效的数字
2. 检查Agent列表是否已正确加载
3. 查看浏览器/应用控制台的错误信息

### 多实例问题
1. 确认使用了 `app.requestSingleInstanceLock()`
2. 检查second-instance事件处理是否正确配置 