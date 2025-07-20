#!/bin/bash

# macOS 本地开发打包脚本（无签名版本）
# 使用方法: ./scripts/build-mac-dev.sh

set -e

echo "🔍 开始 macOS 本地开发打包..."

# 检查是否在 macOS 上运行
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 此脚本只能在 macOS 上运行"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 下载二进制文件
echo "⬇️  下载二进制文件..."
npm run download:darwin-bin

# 构建应用
echo "🔨 构建应用..."
npm run build:electron

# 打包 ZIP (x64) - 无签名版本
echo "📦 打包 x64 版本 (无签名)..."
npm run package:darwin-zip:x64

echo "✅ 打包完成！"
echo ""
echo "📋 使用说明："
echo "1. 解压生成的 ZIP 文件"
echo "2. 右键点击 MCP-X.app"
echo "3. 选择 '打开' -> '打开'"
echo "4. 或者在终端运行: open /path/to/MCP-X.app"
echo ""
echo "📁 输出目录: release/$(node -p "require('./package.json').version")"

# 显示输出文件
VERSION=$(node -p "require('./package.json').version")
echo "📦 生成的文件:"
ls -la "release/$VERSION/"*.zip 2>/dev/null || echo "未找到 ZIP 文件" 