#!/bin/bash

# GitHub Releases 发布脚本
# 使用方法: ./scripts/publish-release.sh

set -e

VERSION="0.0.4"
REPO="TimeCyber/MCP-X"
TAG="v$VERSION"

echo "🚀 开始发布 $VERSION 版本到 GitHub Releases..."

# 检查是否安装了 gh CLI
if ! command -v gh &> /dev/null; then
    echo "❌ 未找到 GitHub CLI (gh)，请先安装:"
    echo "   brew install gh"
    echo "   gh auth login"
    exit 1
fi

# 检查是否已登录
if ! gh auth status &> /dev/null; then
    echo "❌ 请先登录 GitHub CLI:"
    echo "   gh auth login"
    exit 1
fi

# 检查打包文件
echo "📦 检查打包文件..."
RELEASE_DIR="release/$VERSION"
if [ ! -d "$RELEASE_DIR" ]; then
    echo "❌ 未找到发布目录: $RELEASE_DIR"
    echo "请先运行打包命令: npm run package:darwin-zip:x64"
    exit 1
fi

# 查找打包文件
ZIP_FILES=$(find "$RELEASE_DIR" -name "*.zip" 2>/dev/null || true)
DMG_FILES=$(find "$RELEASE_DIR" -name "*.dmg" 2>/dev/null || true)

if [ -z "$ZIP_FILES" ] && [ -z "$DMG_FILES" ]; then
    echo "❌ 未找到打包文件，请先完成打包"
    exit 1
fi

echo "✅ 找到以下打包文件:"
[ -n "$ZIP_FILES" ] && echo "$ZIP_FILES"
[ -n "$DMG_FILES" ] && echo "$DMG_FILES"

# 创建或更新 release
echo "🏷️  创建 GitHub Release: $TAG"

# 检查是否已存在该标签
if gh release view "$TAG" &> /dev/null; then
    echo "⚠️  Release $TAG 已存在，将更新现有 release"
    gh release delete "$TAG" --yes
fi

# 创建 release
RELEASE_NOTES="## MCP-X v$VERSION

### 🆕 新功能
- 更新了最新的 dev202507 分支代码
- 优化了 macOS 应用打包配置
- 添加了本地开发打包脚本

### 🔧 修复
- 修复了 macOS 应用签名问题
- 解决了 Electron 打包配置问题

### 📦 下载
- macOS x64: ZIP 格式
- 支持本地开发模式运行

### 🚀 使用方法
1. 下载对应平台的安装包
2. 解压并运行应用
3. 对于 macOS，如果遇到安全提示，请在系统偏好设置中允许运行

---
*构建时间: $(date)*"

echo "$RELEASE_NOTES" > release-notes.md

# 创建 release
gh release create "$TAG" \
    --title "MCP-X v$VERSION" \
    --notes-file release-notes.md \
    --draft=false \
    --prerelease=false

# 上传文件
echo "📤 上传打包文件..."
for file in $ZIP_FILES $DMG_FILES; do
    if [ -f "$file" ]; then
        echo "上传: $file"
        gh release upload "$TAG" "$file" --clobber
    fi
done

# 清理
rm -f release-notes.md

echo "✅ 发布完成！"
echo "🔗 Release 链接: https://github.com/$REPO/releases/tag/$TAG"

# 显示 release 信息
gh release view "$TAG" 