import { app, session } from "electron"

export interface ProxySettings {
  type: string // "none" | "system" | "custom"
  host?: string
  port?: string
  username?: string
  password?: string
}

/**
 * 获取系统实际代理配置
 * @returns 返回一个Promise，解析为实际的代理配置信息
 */
export async function getSystemProxyInfo(): Promise<string> {
  try {
    // 通过解析一个通用URL来获取系统代理信息
    const proxy = await session.defaultSession.resolveProxy("https://www.google.com")
    return proxy
  } catch (error) {
    console.error("获取系统代理失败:", error)
    return "获取系统代理失败"
  }
}

/**
 * 设置应用的代理
 * @param proxySettings 代理设置
 */
export function setProxy(proxySettings: ProxySettings): void {
  const { type, host, port, username, password } = proxySettings

  // 获取默认session
  const defaultSession = session.defaultSession

  if (type === "none") {
    // 不使用代理
    defaultSession.setProxy({ mode: "direct" })
    console.log("已禁用代理")
  } else if (type === "system") {
    // 使用系统代理
    defaultSession.setProxy({ mode: "system" })
    console.log("已启用系统代理")
    
    // 获取并显示实际系统代理信息
    getSystemProxyInfo().then(proxyInfo => {
      console.log("系统代理信息:", proxyInfo)
      // 解析PROXY字符串(如: "PROXY 127.0.0.1:7890")获取实际IP和端口
      if (proxyInfo.startsWith("PROXY ")) {
        const proxyAddress = proxyInfo.substring(6).trim()
        const [proxyHost, proxyPort] = proxyAddress.split(":")
        console.log("系统代理IP:", proxyHost, "端口:", proxyPort)
      }
    })
  } else if (type === "custom" && host && port) {
    // 使用自定义代理
    const proxyUrl = `http://${host}:${port}`
    
    const config: any = { proxyRules: proxyUrl }
    
    // 如果有用户名和密码
    if (username && password) {
      config.proxyBypassRules = `<-loopback>`
      
      // 设置代理认证
      defaultSession.webRequest.onBeforeSendHeaders(
        (details, callback) => {
          callback({
            requestHeaders: {
              ...details.requestHeaders,
              "Proxy-Authorization": `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
            }
          })
        }
      )
    }
    
    defaultSession.setProxy(config)
    console.log(`已启用自定义代理: ${proxyUrl}`)
  }
}

/**
 * 应用启动时初始化代理设置
 * @param proxySettings 代理设置
 */
export function initProxy(proxySettings: ProxySettings): void {
  console.log("初始化代理设置:", JSON.stringify(proxySettings))
  if (proxySettings) {
    setProxy(proxySettings)
  }
}