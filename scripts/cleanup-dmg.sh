#!/bin/bash

# 清理 DMG 卷脚本
# 使用方法: ./scripts/cleanup-dmg.sh

echo "🧹 清理残留的 DMG 卷..."

# 查找所有 MCPX 相关的卷
MCPX_VOLUMES=$(diskutil list | grep -i mcpx | awk '{print $NF}' | grep -v "disk" || true)

if [ -n "$MCPX_VOLUMES" ]; then
    echo "找到以下 MCPX 卷:"
    echo "$MCPX_VOLUMES"
    
    for volume in $MCPX_VOLUMES; do
        echo "卸载卷: $volume"
        hdiutil detach "$volume" -force 2>/dev/null || true
    done
else
    echo "没有找到需要清理的 MCPX 卷"
fi

# 检查 /Volumes 目录
VOLUME_DIRS=$(ls -la /Volumes/ | grep -i mcpx | awk '{print $NF}' || true)

if [ -n "$VOLUME_DIRS" ]; then
    echo "清理 /Volumes 目录中的残留文件..."
    for dir in $VOLUME_DIRS; do
        if [ -d "/Volumes/$dir" ]; then
            echo "清理目录: /Volumes/$dir"
            rm -rf "/Volumes/$dir" 2>/dev/null || true
        fi
    done
fi

echo "✅ 清理完成！" 