import { net, protocol } from "electron"
import path from "node:path"

protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-file",
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
    }
  }
])

protocol.registerSchemesAsPrivileged([
  {
    scheme: "img",
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
    }
  }
])

export function initProtocol() {
  protocol.handle("local-file", (req) => {
    const url = req.url.replace("local-file:///", process.platform === "win32" ? "file:///" : "file://")
    return net.fetch(url)
  })

  protocol.handle("img", (req) => {
    // Remove 'img://'
    const url = req.url.substring(6);
    const assetPath = path.join(process.env.VITE_PUBLIC, "image", url)
    return net.fetch(`file://${assetPath}`)
  })

}