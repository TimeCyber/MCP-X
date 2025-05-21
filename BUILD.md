## Table of Contents Build mcpx

- [Development Requirements](#development-requirements)
- [Development](#development)
  - [Install dependencies](#install-dependencies)
  - [Start development server](#start-development-server)
- [Build for production](#build-for-production)
  - [Cross-platform Build for Windows](#cross-platform-build-for-windows)
- [Scripts](#scripts)
- [Package Scripts](#package-scripts)
- [MCP Server Setup](#mcp-server-setup)
  - [1. Add New MCP Server via GUI](#1-add-new-mcp-server-via-gui)
  - [2. Edit config.json directly](#2-edit-configjson-directly)
  - [3. Using Config Editor](#3-using-config-editor)
  - [4. Custom Scripts](#4-custom-scripts)
- [Project Architecture](#project-architecture)

## Development Requirements

- Node.js LTS+

## Development

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev:electron
```

## Build for production

```bash
npm run package
```

### Cross-platform Build for Windows

If you are on macOS or Linux and want to build for Windows:

1. Download Windows binaries
```bash
npm run download:windows-bin
```

2. Build using Docker
```bash
./scripts/docker/build-win.sh
```

## Scripts

- `dev` - Start Vite development server
- `dev:electron` - Start Electron development server
- `build` - Build web assets
- `build:electron` - Build Electron application
- `download:windows-bin` - Download Windows binaries for cross-platform build

## Package Scripts

- `package` - Create application directory
- `package:windows` - Create Windows distributable package
- `package:linux` - Create Linux distributable package
- `docker:build-win` - Build Windows version using Docker

## MCP Server Setup

After first launch, you can find the `config.json` file in these locations:

- macOS: `~/Library/Preferences/mcpx`
- Windows: `C:\Users\USERNAME\AppData\Local\MCPX\Data`
- Linux: `~/.config/mcpx`

There are four ways to configure MCP servers:

### 1. Add New MCP Server via GUI

1. Click the menu button in the top-left corner to open the sidebar
2. Click "MCP Server Management" at the bottom
3. Click the "Add MCP Server" button
4. Paste your MCP server configuration in JSON format
5. Click "Save" to add the new server

Example configuration:
```json
{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

### 2. Edit config.json directly

You can edit the `config.json` file directly in the above locations following each MCP server's documentation.

### 3. Using Config Editor

1. Click the menu button in the top-left corner to open the sidebar
2. Click "MCP Server Management" at the bottom
3. Click the "Edit Config" button on the page

### 4. Custom Scripts

You can add your own MCP server scripts in the `.mcpx/scripts` directory in your home folder, then update the `config.json` accordingly.

Example:

1. Create a new file `echo.js` in `~/.mcpx/scripts`
2. Update `config.json`:

```json
{
  "mcpServers": {
    "echo": {
      "enabled": true,
      "command": "node",
      "args": [
        "echo.js"
      ]
    }
  }
}
```

## Project Architecture

```
src/
├── atoms/              # Global state management
│   ├── configState.ts    # Model configuration state
│   ├── interfaceState.ts # UI interface state
│   └── historyState.ts   # Chat history state
│
├── components/         # Reusable UI components
│   ├── ModelConfigForm  # Model settings form
│   ├── Toast           # Toast notifications
│   └── Header          # App header
│
├── views/             # Page components
│   ├── Chat/           # Chat interface
│   ├── Setup/          # Initial setup
│   └── Welcome/        # Welcome page
│
├── styles/            # SCSS stylesheets
│   ├── components/     # Component styles
│   └── pages/         # Page-specific styles
│
└── hooks/             # Custom React hooks

electron/
├── main/             # Main process
│   └── index.ts       # Main entry
└── preload/          # Preload scripts
    └── index.ts       # Bridge between main and renderer

services/            # Backend services
```
