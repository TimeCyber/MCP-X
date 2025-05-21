import { BrowserWindow } from "electron"
import { ipcEnvHandler } from "./env"
import { ipcSystemHandler } from "./system"
import { ipcUtilHandler } from "./util"
import { ipcLlmHandler } from "./llm"
import { ipcMenuHandler } from "./menu"
// import { ipcServerHandler } from "./server"
// import { ipcUpdateHandler } from "./update"
import { ipcMain, dialog, shell } from "electron"
import path from "path"

export function ipcHandler(win: BrowserWindow) {
  ipcEnvHandler(win)
  ipcSystemHandler(win)
  ipcUtilHandler(win)
  ipcLlmHandler(win)
  ipcMenuHandler(win)
  // ipcServerHandler(win)
  // ipcUpdateHandler(win)

  // 添加选择目录对话框处理程序
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择目录',
      buttonLabel: '选择'
    })
    return result
  })
  
  // 处理打开外部链接
  ipcMain.on('open-external', (_, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
  })
}