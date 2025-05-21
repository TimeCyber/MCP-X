import fse from "fs-extra"
import path from "path"
import { execSync } from "child_process"

export function setAppImageAutoLaunch(enable: boolean) {
  if (!process.env.APPIMAGE) {
    return false
  }

  try {
    const appImagePath = process.env.APPIMAGE

    try {
      execSync(`chmod +x "${appImagePath}"`)
    } catch (error) {
      console.error("Failed to set executable permission for AppImage", error)
    }

    const autostartDir = path.join(
      process.env.HOME || "~",
      ".config/autostart"
    )

    if (!fse.existsSync(autostartDir)) {
      fse.mkdirSync(autostartDir, { recursive: true })
    }

    const desktopFile = path.join(autostartDir, "mcpx-ai.desktop")

    if (enable) {
      const desktopContent = getAppImageDesktopFile()
      fse.writeFileSync(desktopFile, desktopContent)
    } else {
      if (fse.existsSync(desktopFile)) {
        fse.unlinkSync(desktopFile)
      }
    }
    return true
  } catch (error) {
    return false
  }
}

export function checkAppImageAutoLaunchStatus() {
  if (!process.env.APPIMAGE) {
    return false
  }

  const desktopFile = path.join(
    process.env.HOME || "~",
    ".config/autostart/mcpx-ai.desktop"
  )
  return fse.existsSync(desktopFile)
}

export function getAppImageDesktopFile() {
  const desktopFile = path.join(process.env.VITE_PUBLIC, "linux", "mcpx-ai.desktop")
  const content = fse.existsSync(desktopFile) ? fse.readFileSync(desktopFile, "utf-8") : `[Desktop Entry]
Type=Application
Name=MCP-X
Exec=%EXEC%
Icon=%ICON%
StartupNotify=false
Terminal=false
Categories=Utility;
%APPEND%`

  return content
    .replace("%EXEC%", process.env.APPIMAGE!)
    .replace("%ICON%", path.join(process.env.VITE_PUBLIC, "icon.ico"))
    .replace("%APPEND%", "X-GNOME-Autostart-enabled=true")
}