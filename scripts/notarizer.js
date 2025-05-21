import dotenv from "dotenv"
import { notarize } from "@electron/notarize"

dotenv.config()

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== "darwin") {
    return
  }

  const appName = context.packager.appInfo.productFilename

  return await notarize({
    tool: "notarytool",
    teamId: process.env.APPLETEAMID,
    appBundleId: "ai.timecyber.mcpx",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    appleIdPassword: process.env.APPLEIDPASS,
  })
}