import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import { useSetAtom, useAtomValue } from 'jotai'
import { loadConfigAtom } from './atoms/configState'
import { useEffect, useState, useRef } from "react"
import { handleGlobalHotkey, loadHotkeyMapAtom } from "./atoms/hotkeyState"
import { handleWindowResizeAtom } from "./atoms/sidebarState"
import { systemThemeAtom } from "./atoms/themeState"
import { navSectionAtom } from "./atoms/navState"
import { useAgentAutoInit } from "./hooks/useAgentInit"
import Updater from "./updater"

function App() {
  const [loading, setLoading] = useState(true)
  const loadConfig = useSetAtom(loadConfigAtom)
  const loadHotkeyMap = useSetAtom(loadHotkeyMapAtom)
  const setSystemTheme = useSetAtom(systemThemeAtom)
  const handleWindowResize = useSetAtom(handleWindowResizeAtom)
  const setNavSection = useSetAtom(navSectionAtom)
  const currentNavSection = useAtomValue(navSectionAtom)
  
  // 使用 useRef 来访问最新的 loading 状态
  const loadingRef = useRef(loading)
  loadingRef.current = loading
  
  // 智能体自动初始化
  useAgentAutoInit()
  
  // Deep Link监听 - 确保在应用加载完成后立即注册
  useEffect(() => {
    // 监听来自主进程的深度链接事件
    const handleOpenAgentDetail = (event: any, agentId: string, retryCount = 0) => {
      const currentLoading = loadingRef.current
      console.log('=== DEEPLINK HANDLER ===')
      console.log('Received deep link navigation to agent:', agentId)
      console.log('Current loading state:', currentLoading)
      console.log('Current nav section before change:', currentNavSection)
      console.log('Retry count:', retryCount)
      
      // 如果应用还在加载中，等待加载完成后再处理（最多重试5次）
      if (currentLoading && retryCount < 5) {
        console.log('App is still loading, deferring deeplink handling...')
        setTimeout(() => handleOpenAgentDetail(event, agentId, retryCount + 1), 1000)
        return
      }
      
      // 如果超过重试次数仍在loading，强制处理
      if (currentLoading && retryCount >= 5) {
        console.log('Max retries reached, forcing deeplink handling despite loading state')
      }
      
      // 设置导航状态为agent模式
      console.log('Setting nav section to "agent"...')
      setNavSection("agent")
      
      // 验证状态变化
      setTimeout(() => {
        console.log('Nav section after change:', currentNavSection)
      }, 100)
      
      // 使用window.location.hash进行导航（React Router会自动响应）
      const targetPath = `/agent/${agentId}`
      console.log('Setting window.location.hash to:', targetPath)
      
      // 直接设置hash，React Router会自动处理路由跳转
      window.location.hash = targetPath
      
      // 为了确保路由生效，稍后检查一下
      setTimeout(() => {
        console.log('Current hash after navigation:', window.location.hash)
        console.log('Expected hash:', `#${targetPath}`)
        if (!window.location.hash.includes(targetPath)) {
          console.warn('Navigation may have failed, trying again...')
          window.location.hash = targetPath
        }
      }, 200)
      
      console.log('=== DEEPLINK HANDLER END ===')
    }

    // 立即注册IPC事件监听器，不依赖loading状态
    if (window.ipcRenderer) {
      window.ipcRenderer.on('open-agent-detail', handleOpenAgentDetail)
      
      // 向主进程确认渲染进程已准备好接收deeplink事件
      window.ipcRenderer.send('renderer-ready')
    }

    // 测试用：手动触发deeplink（开发调试用）
    if (process.env.NODE_ENV === 'development') {
      const testDeeplink = (agentId: string) => {
        console.log('=== MANUAL TEST DEEPLINK ===')
        console.log('Test agentId:', agentId)
        handleOpenAgentDetail(null, agentId, 0)
      }
      
      const checkNavState = () => {
        console.log('=== NAV STATE CHECK ===')
        console.log('Current nav section:', currentNavSection)
        console.log('Current loading state:', loadingRef.current)
        console.log('Window location hash:', window.location.hash)
        console.log('Window location href:', window.location.href)
        console.log('========================')
      }
      
      // 将测试函数暴露到全局，方便在控制台测试
      ;(window as any).testDeeplink = testDeeplink
      ;(window as any).checkNavState = checkNavState
      console.log('Test functions available:')
      console.log('- window.testDeeplink("2")')
      console.log('- window.checkNavState()')
    }

    // 清理函数
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.off('open-agent-detail', handleOpenAgentDetail)
      }
    }
  }, []) // 移除依赖，只在组件挂载时注册一次
  
  // init app
  useEffect(() => {
    // 组件挂载后移除 loading
    document.getElementById('loading')?.remove()
    loadHotkeyMap()
    loadConfig().finally(() => {
      setLoading(false)
      window.postMessage({ payload: "removeLoading" }, "*")
    })

    window.addEventListener("resize", handleWindowResize)
    window.addEventListener("keydown", handleGlobalHotkey)
    return () => {
      window.removeEventListener("resize", handleWindowResize)
      window.removeEventListener("keydown", handleGlobalHotkey)
    }
  }, [])

  // set system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  if (loading) {
    return <></>
  }

  return (
    <>
      <RouterProvider router={router} />
      <Updater />
    </>
  )
}

export default App
