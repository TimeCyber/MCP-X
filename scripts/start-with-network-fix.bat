@echo off
REM 网络服务修复启动脚本 (Windows版本)
REM 这个脚本设置环境变量来避免网络服务崩溃和无限重试

echo 🚀 启动MCP-X应用（网络服务修复模式）...

REM 设置环境变量来避免网络问题
set DISABLE_AUTO_RETRY=true
set MAX_RETRY_ATTEMPTS=1
set RETRY_DELAY_MS=1000
set REQUEST_TIMEOUT_MS=3000
set DISABLE_AGENT_SYNC=true
set DISABLE_MCP_AUTO_RECONNECT=true

REM 清除可能的端口占用
echo 🔧 检查端口占用...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4321') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :61990') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :6190') do taskkill /f /pid %%a 2>nul

REM 启动应用
echo 🎯 启动应用...
npm run dev:electron

echo ✅ 应用启动完成
pause 