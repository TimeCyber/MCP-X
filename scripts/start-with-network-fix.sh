#!/bin/bash

# 网络服务修复启动脚本
# 这个脚本设置环境变量来避免网络服务崩溃和无限重试

echo "🚀 启动MCP-X应用（网络服务修复模式）..."

# 设置环境变量来避免网络问题
export DISABLE_AUTO_RETRY=true
export MAX_RETRY_ATTEMPTS=1
export RETRY_DELAY_MS=1000
export REQUEST_TIMEOUT_MS=3000
export DISABLE_AGENT_SYNC=true
export DISABLE_MCP_AUTO_RECONNECT=true

# 清除可能的端口占用
echo "🔧 检查端口占用..."
lsof -ti:4321 | xargs kill -9 2>/dev/null || true
lsof -ti:61990 | xargs kill -9 2>/dev/null || true
lsof -ti:6190 | xargs kill -9 2>/dev/null || true

# 清除缓存
echo "🧹 清除应用缓存..."
rm -rf ~/Library/Application\ Support/mcpx/Cache 2>/dev/null || true
rm -rf ~/Library/Application\ Support/mcpx/Code\ Cache 2>/dev/null || true

# 启动应用
echo "🎯 启动应用..."
npm run dev:electron

echo "✅ 应用启动完成" 