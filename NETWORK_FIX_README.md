# 网络服务崩溃问题解决方案

## 问题描述

如果您遇到以下问题：
- 应用启动后显示"网络服务崩溃，重启服务"的错误
- 网络请求一直反复，无法进入程序主页面
- 应用卡在加载界面，无法正常使用

## 解决方案

### 方法1：使用修复启动脚本（推荐）

#### macOS/Linux 用户：
```bash
npm run dev:electron:fix
```

#### Windows 用户：
```cmd
npm run dev:electron:fix:win
```

### 方法2：手动设置环境变量

在启动应用前，设置以下环境变量：

#### macOS/Linux：
```bash
export DISABLE_AUTO_RETRY=true
export MAX_RETRY_ATTEMPTS=1
export RETRY_DELAY_MS=1000
export REQUEST_TIMEOUT_MS=3000
export DISABLE_AGENT_SYNC=true
export DISABLE_MCP_AUTO_RECONNECT=true
npm run dev:electron
```

#### Windows：
```cmd
set DISABLE_AUTO_RETRY=true
set MAX_RETRY_ATTEMPTS=1
set RETRY_DELAY_MS=1000
set REQUEST_TIMEOUT_MS=3000
set DISABLE_AGENT_SYNC=true
set DISABLE_MCP_AUTO_RECONNECT=true
npm run dev:electron
```

### 方法3：清除端口占用

如果端口被占用，可以手动清除：

#### macOS/Linux：
```bash
# 清除可能占用的端口
lsof -ti:4321 | xargs kill -9 2>/dev/null || true
lsof -ti:61990 | xargs kill -9 2>/dev/null || true
lsof -ti:6190 | xargs kill -9 2>/dev/null || true
```

#### Windows：
```cmd
# 查找并终止占用端口的进程
netstat -aon | findstr :4321
taskkill /f /pid <进程ID>
```

### 方法4：清除应用缓存

#### macOS：
```bash
rm -rf ~/Library/Application\ Support/mcpx/Cache
rm -rf ~/Library/Application\ Support/mcpx/Code\ Cache
```

#### Windows：
```cmd
rmdir /s /q "%APPDATA%\mcpx\Cache"
rmdir /s /q "%APPDATA%\mcpx\Code Cache"
```

## 环境变量说明

- `DISABLE_AUTO_RETRY=true`: 禁用自动重试，避免无限循环
- `MAX_RETRY_ATTEMPTS=1`: 设置最大重试次数为1次
- `RETRY_DELAY_MS=1000`: 设置重试延迟为1秒
- `REQUEST_TIMEOUT_MS=3000`: 设置请求超时时间为3秒
- `DISABLE_AGENT_SYNC=true`: 禁用智能体同步，避免网络请求循环
- `DISABLE_MCP_AUTO_RECONNECT=true`: 禁用MCP服务器自动重连

## 问题原因

网络服务崩溃通常由以下原因引起：

1. **端口冲突**: 多个服务尝试使用相同端口
2. **网络代理问题**: 代理设置导致请求失败
3. **无限重试循环**: 服务失败后不断重试，导致资源耗尽
4. **智能体同步问题**: 智能体状态同步失败导致循环请求
5. **MCP服务器连接问题**: MCP服务器连接失败导致重连循环

## 预防措施

1. 确保没有其他应用占用相关端口
2. 检查网络代理设置是否正确
3. 定期清除应用缓存
4. 使用修复启动脚本启动应用

## 如果问题仍然存在

如果使用以上方法后问题仍然存在，请：

1. 检查系统防火墙设置
2. 尝试禁用杀毒软件的实时保护
3. 检查网络连接是否稳定
4. 查看应用日志文件获取详细错误信息 