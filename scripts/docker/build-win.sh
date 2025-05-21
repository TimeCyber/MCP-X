#!/bin/bash

echo "Building Docker image..."
docker build \
  -f docker/win-build/Dockerfile \
  -t mcpx-builder-win:latest .

echo "Building Windows executable..."
docker run --rm \
  -v ${PWD}/release:/app/release \
  mcpx-builder-win:latest

echo "Build complete! Check the release folder for output." 