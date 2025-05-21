#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <cpu> <platform>"
    echo "Example: $0 x64 win32"
    echo "Available options:"
    echo "  CPU: x64, arm64"
    echo "  Platform: win32, linux, darwin"
    exit 1
fi

ARCH=$1
PLATFORM=$2

echo "Installing sharp for $PLATFORM ($ARCH)..."
npm install --cpu=$ARCH --os=$PLATFORM sharp 