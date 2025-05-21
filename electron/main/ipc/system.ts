import { app, ipcMain, shell, BrowserWindow } from "electron"
import AppState from "../state"
import { scriptsDir } from "../constant"
import { store } from "../store"

import {
  checkAppImageAutoLaunchStatus,
  setAppImageAutoLaunch,
} from "../platform/appimage"
import { destroyTray, initTray } from "../tray"
import { setProxy } from "../proxy"

export function ipcSystemHandler(win: BrowserWindow) {
  ipcMain.handle("system:openScriptsDir", async () => {
    shell.openPath(scriptsDir)
  })

  ipcMain.handle("system:getAutoLaunch", () => {
    if (process.env.APPIMAGE) {
      return checkAppImageAutoLaunchStatus()
    }

    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle("system:setAutoLaunch", (event, enable) => {
    store.set("autoLaunch", enable)

    if (process.env.APPIMAGE) {
      setAppImageAutoLaunch(enable)
    } else {
      app.setLoginItemSettings({
        openAtLogin: enable,
        openAsHidden: false,
      })
    }

    return enable
  })

  ipcMain.handle("system:getMinimalToTray", () => {
    return store.get("minimalToTray")
  })

  ipcMain.handle("system:setMinimalToTray", (event, enable) => {
    store.set("minimalToTray", enable)
    AppState.setIsQuitting(!enable)

    if (enable) {
      initTray(win)
    } else {
      destroyTray()
    }
  })

  ipcMain.handle("system:getProxySettings", () => {
    return store.get("proxy")
  })

  ipcMain.handle("system:setProxySettings", (event, proxySettings) => {
    store.set("proxy", proxySettings)
    setProxy(proxySettings)
    return proxySettings
  })
}
