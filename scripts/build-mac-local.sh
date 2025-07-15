#!/bin/bash

# macOS 本地打包脚本
# 使用方法: ./scripts/build-mac-local.sh

set -e

echo "🔍 检查 macOS 打包环境..."

# 检查是否在 macOS 上运行
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 此脚本只能在 macOS 上运行"
    exit 1
fi

# 检查证书
echo "🔑 检查代码签名证书..."
CERTIFICATES=$(security find-identity -v -p codesigning)
if [[ -z "$CERTIFICATES" ]]; then
    echo "❌ 未找到代码签名证书"
    echo "请安装 Apple 开发者证书到钥匙串中"
    exit 1
fi

echo "✅ 找到以下证书:"
echo "$CERTIFICATES"

# 检查环境变量
if [[ -z "$APPLEID" || -z "$APPLEIDPASS" || -z "$APPLETEAMID" ]]; then
    echo "⚠️  未设置公证环境变量，将跳过公证步骤"
    echo "如需公证，请设置以下环境变量:"
    echo "  export APPLEID='your-apple-id'"
    echo "  export APPLEIDPASS='your-app-specific-password'"
    echo "  export APPLETEAMID='your-team-id'"
    echo ""
    echo "继续打包但不公证..."
    
    # 临时禁用公证
    sed -i '' 's/"afterSign": "\.\/scripts\/notarizer\.js",/"afterSign": "",/' electron-builder.json
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

# 打包 DMG (x64)
echo "📦 打包 x64 版本..."
npm run package:darwin-dmg:x64

# 打包 DMG (arm64)
echo "📦 打包 arm64 版本..."
npm run package:darwin-dmg:arm64

# 恢复配置
if [[ -z "$APPLEID" || -z "$APPLEIDPASS" || -z "$APPLETEAMID" ]]; then
    sed -i '' 's/"afterSign": "",/"afterSign": "\.\/scripts\/notarizer\.js",/' electron-builder.json
fi

echo "✅ 打包完成！"
echo "📁 输出目录: release/$(node -p "require('./package.json').version")"

# 显示输出文件
VERSION=$(node -p "require('./package.json').version")
ls -la "release/$VERSION/"*.dmg 2>/dev/null || echo "未找到 DMG 文件" 