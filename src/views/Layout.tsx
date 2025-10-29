import React from "react"
import { Outlet, useLocation } from "react-router-dom"
import HistorySidebar from "../components/HistorySidebar"
import Header from "../components/Header"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { isConfigNotInitializedAtom } from "../atoms/configState"
import GlobalToast from "../components/GlobalToast"
import { themeAtom, systemThemeAtom } from "../atoms/themeState"
import Overlay from "./Overlay"
import KeymapModal from "../components/Modal/KeymapModal"
import CodeModal from "./Chat/CodeModal"
import SideNav from "../components/SideNav";
import { navSectionAtom } from "../atoms/navState"
import AgentSidebar from "../components/AgentSidebar"
import ModelsOverlay from "../views/Overlay/Model"   // 模型设置页
import ToolsOverlay from "../views/Overlay/Tools"    // 工具管理页根组件
import SystemOverlay from "../views/Overlay/System"  // 系统设置页根组件
import AgentChatPanel from "./AgentChatPanel"

const Layout = () => {
  const isConfigNotInitialized = useAtomValue(isConfigNotInitializedAtom)
  const [theme] = useAtom(themeAtom)
  const [nav] = useAtom(navSectionAtom)
  const [systemTheme] = useAtom(systemThemeAtom)
  const location = useLocation()

  const setNavSection = useSetAtom(navSectionAtom)
  
  // 根据路由自动设置导航状态
  React.useEffect(() => {
    if (location.pathname.startsWith("/knowledge")) {
      setNavSection("knowledge");
    } else if (location.pathname.startsWith("/agent")) {
      setNavSection("agent");
    } else if (location.pathname.startsWith("/chat")) {
      setNavSection("chat");
    } else if (location.pathname === "/") {
      // 默认首页重定向到聊天页面
      setNavSection("chat");
    }
  }, [location.pathname, setNavSection])

  return (
    <div className="app-container" data-theme={theme === "system" ? systemTheme : theme}>
      <div className="app-content">
        {!isConfigNotInitialized && <SideNav />}
        {(() => {
          if (isConfigNotInitialized) return null;
          switch (nav) {
            case "agent":
              return <AgentSidebar />;
            case "chat":
              return <HistorySidebar />;
            case "knowledge":
              return null; // 知识库不需要侧边栏
            default:
              return null;
          }
        })()}
        <div className={`outlet-container ${nav === "agent" ? "agent-nav-active" : ""}`}>
          {!isConfigNotInitialized && <Header showHelpButton showModelSelect={nav !== "knowledge"} showAgentSelect />}
          {(() => {
            switch (nav) {
              case "chat":
                return <Outlet />; // 聊天页面由React Router处理
              case "agent":
                // 如果是agent页面的路由，让React Router处理
                if (location.pathname.startsWith("/agent")) {
                  return <Outlet />;
                }
                // 否则渲染默认的AgentChatPanel（向后兼容）
                return <AgentChatPanel />;
              case "knowledge":
                return <Outlet />; // 知识库页面由React Router处理
              case "model":
                return <ModelsOverlay />;
              case "tools":
                return <ToolsOverlay />;
              case "system":
                return <SystemOverlay />;
              default:
                return <Outlet />;
            }
          })()}
        </div>
        <CodeModal />
      </div>
      <Overlay />
      <GlobalToast />
      <KeymapModal />
    </div>
  )
}

export default React.memo(Layout)
