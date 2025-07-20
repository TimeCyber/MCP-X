#!/bin/bash

# GitHub 自动发布脚本
# 使用方法: ./scripts/publish-to-github.sh

set -e

VERSION="0.0.4"
TAG="v$VERSION"
REPO="TimeCyber/MCP-X"

echo "🚀 开始发布 $VERSION 版本到 GitHub..."

# 检查是否已存在标签
if git tag -l | grep -q "$TAG"; then
    echo "⚠️  标签 $TAG 已存在，将删除并重新创建"
    git tag -d "$TAG" 2>/dev/null || true
    git push origin ":refs/tags/$TAG" 2>/dev/null || true
fi

# 创建新标签
echo "🏷️  创建 Git 标签: $TAG"
git tag "$TAG"

# 推送标签
echo "📤 推送标签到 GitHub..."
git push origin "$TAG"

# 等待标签同步
echo "⏳ 等待标签同步..."
sleep 5

# 清理残留的 DMG 卷
echo "🧹 清理残留的 DMG 卷..."
./scripts/cleanup-dmg.sh

# 打包并发布 (arm64)
echo "📦 打包 arm64 版本并发布..."
scripts/install-deps.sh arm64 darwin && npm run build:electron && electron-builder --mac dmg --arm64 --publish=onTag

# 清理残留的 DMG 卷
echo "🧹 清理残留的 DMG 卷..."
./scripts/cleanup-dmg.sh

# 打包并发布 (x64)
echo "📦 打包 x64 版本并发布..."
scripts/install-deps.sh x64 darwin && npm run build:electron && electron-builder --mac dmg --x64 --publish=onTag

echo "✅ 发布完成！"
echo "🔗 Release 链接: https://github.com/$REPO/releases/tag/$TAG" 