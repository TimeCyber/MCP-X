import { app, BrowserWindow, shell, ipcMain, session } from "electron"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"
import os from "node:os"
import AppState from "./state"
import { cleanup, initMCPClient } from "./service"
import { getDarwinSystemPath, modifyPath } from "./util"
import { binDirList, darwinPathList } from "./constant"
import { update } from "./update"
import { ipcHandler } from "./ipc"
import { initTray } from "./tray"
import { store } from "./store"
import { initProtocol } from "./protocol"
import { initProxy, ProxySettings } from "./proxy"

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, "../..")

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1"))
  app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === "win32")
  app.setAppUserModelId(app.getName())

// 注册自定义协议
const PROTOCOL_NAME = 'mcp-x'
if (process.defaultApp) {
  // 开发环境下的特殊处理
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  // 生产环境
  app.setAsDefaultProtocolClient(PROTOCOL_NAME)
}

// 渲染进程准备状态（使用global对象共享）
;(global as any).rendererReady = false

// URL处理函数
function handleDeepLink(url: string) {
  console.log('=== MAIN PROCESS DEEPLINK ===')
  console.log('Deep link received:', url)
  console.log('Renderer ready:', (global as any).rendererReady)
  
  if (!url || !url.startsWith(`${PROTOCOL_NAME}://`)) {
    console.log('Invalid URL format, ignoring')
    return
  }

  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    
    // 解析 mcp-x://agent/{id} 格式的URL
    if (pathname.startsWith('/agent/')) {
      const agentId = pathname.split('/agent/')[1]
      if (agentId && win) {
        console.log('Extracted agent ID:', agentId)
        
        // 如果渲染进程还没有准备好，等待或者延迟发送
        if (!(global as any).rendererReady) {
          console.log('Renderer not ready, delaying deeplink...')
          // 等待渲染进程准备好，最多等待10秒
          let retries = 0
          const maxRetries = 20 // 10秒
          const checkAndSend = () => {
            if ((global as any).rendererReady || retries >= maxRetries) {
              console.log('Sending deeplink to renderer (ready:', (global as any).rendererReady, 'retries:', retries, ')')
              win?.webContents.send('open-agent-detail', agentId)
            } else {
              retries++
              setTimeout(checkAndSend, 500)
            }
          }
          checkAndSend()
        } else {
          console.log('Sending deeplink to renderer immediately')
          // 发送IPC消息到渲染进程
          win.webContents.send('open-agent-detail', agentId)
        }
      }
    }
  } catch (error) {
    console.error('Failed to parse deep link URL:', error)
  }
  console.log('=== MAIN PROCESS DEEPLINK END ===')
}

// 获取启动时的URL参数（Windows/Linux）
function getStartupUrl(): string | null {
  // 在开发环境下，URL参数可能在不同位置
  const args = process.argv
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith(`${PROTOCOL_NAME}://`)) {
      return args[i]
    }
  }
  return null
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, "../preload/index.mjs")
const indexHtml = path.join(RENDERER_DIST, "index.html")

async function onReady() {
  if (process.platform === "win32") {
    binDirList.forEach(modifyPath)
  } else if (process.platform === "darwin") {
    if (!process.env.PATH) {
      process.env.PATH = await getDarwinSystemPath().catch(() => "")
    }

    darwinPathList.forEach(modifyPath)
  }

  // 初始化代理设置
  const proxySettings = store.get("proxy") as ProxySettings
  console.log("从store获取的代理设置:", JSON.stringify(proxySettings))
  initProxy(proxySettings)

  //   // 在electron/main/index.ts中，应用启动时设置
  if (proxySettings && proxySettings.type === "system") {
    // 获取系统代理
    const proxyInfo = await session.defaultSession.resolveProxy("https://api.openai.com");
    if (proxyInfo.startsWith("PROXY ")) {
      const proxyUrl = "http://" + proxyInfo.substring(6).trim();
      process.env.HTTP_PROXY = proxyUrl;
      process.env.HTTPS_PROXY = proxyUrl;
      console.log("已设置Node.js环境代理变量:", proxyUrl);
    }
  }

  initMCPClient()
  initProtocol()
  createWindow()
  
  // 处理启动时的URL参数
  const startupUrl = getStartupUrl()
  if (startupUrl) {
    // 延迟处理，确保窗口已创建和加载完成
    setTimeout(() => {
      if (win && win.webContents) {
        handleDeepLink(startupUrl)
      }
    }, 2000) // 增加延迟时间，确保应用完全加载
  }
}

async function createWindow() {
  win = new BrowserWindow({
    title: "MCP-X",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    width: 1280,
    height: 720,
    minHeight: 320,
    minWidth: 400,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  // 移除默认菜单
  win.setMenu(null)

  // resolve cors
  win.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, Origin: '*' } });
    },
  );

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  });

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:"))
      shell.openExternal(url)

    return { action: "deny" }
  })

  win.on("close", (event) => {
    if (!AppState.isQuitting) {
      event.preventDefault()
      win?.hide()
      return false
    }

    return true
  })

  // Auto update
  update(win)

  // Tray
  const shouldminimalToTray = store.get("minimalToTray")
  if (process.platform !== "darwin" && shouldminimalToTray) {
    initTray(win)
    AppState.setIsQuitting(false)
  }

  // ipc handler
  ipcHandler(win)

  const shouldAutoLaunch = store.get("autoLaunch")
  app.setLoginItemSettings({
    openAtLogin: shouldAutoLaunch,
    openAsHidden: false
  })
}

app.whenReady().then(onReady)

app.on("window-all-closed", async () => {
  win = null

  if (process.platform !== "darwin" && AppState.isQuitting) {
    await cleanup()
    app.quit()
  }
})

app.on("second-instance", (event, commandLine, workingDirectory) => {
  console.log('=== SECOND INSTANCE EVENT ===')
  console.log('Command line:', commandLine)
  console.log('Working directory:', workingDirectory)
  
  // 处理已运行实例的情况
  if (win) {
    // 聚焦到现有窗口
    if (win.isMinimized()) win.restore()
    win.focus()
    
    // 查找命令行参数中的URL
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`))
    console.log('Found URL in command line:', url)
    if (url) {
      handleDeepLink(url)
    } else {
      console.log('No deeplink URL found in command line arguments')
    }
  }
  console.log('=== SECOND INSTANCE EVENT END ===')
})

// macOS 专用的 URL 处理
app.on('open-url', (event, url) => {
  event.preventDefault()
  console.log('macOS open-url event:', url)
  
  if (win) {
    // 应用已运行，聚焦窗口并处理URL
    if (win.isMinimized()) win.restore()
    win.focus()
    handleDeepLink(url)
  } else {
    // 应用未运行，先创建窗口，然后处理URL
    createWindow().then(() => {
      setTimeout(() => {
        if (win && win.webContents) {
          handleDeepLink(url)
        }
      }, 2000) // 增加延迟时间，确保应用完全加载
    })
  }
})

app.on("before-quit", () => {
  AppState.setIsQuitting(true)
})

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    if (win) {
      win.show()
    } else {
      createWindow()
    }
  }
})

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
