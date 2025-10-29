import React from "react"
import * as Portal from "@radix-ui/react-portal"
import { DismissableLayer } from "@radix-ui/react-dismissable-layer"
import { useAtom } from "jotai"
import { sidebarVisibleAtom } from "../atoms/sidebarState"
import { navSectionAtom } from "../atoms/navState"

export type PopupStylePorps = {
  zIndex?: number
  noBackground?: boolean
}

type PopupWindowProps = PopupStylePorps & {
  children: React.ReactNode
  overlay?: boolean
  onClickOutside?: () => void
}

export default function PopupWindow({
  children,
  zIndex = 100,
  onClickOutside = () => {},
  overlay = false,
  noBackground = false,
}: PopupWindowProps) {
  const [isSidebarVisible] = useAtom(sidebarVisibleAtom)
  const [nav] = useAtom(navSectionAtom)
  const root = document.body

  // 根据nav状态和sidebar可见性决定overlay的布局模式
  let overlayModeClass = ""
  if (overlay) {
    if (nav === "tools" || nav === "model" || nav === "system" || nav === "agent" || nav === "chat") {
      // 工具/模型/系统设置模式：只显示SideNav，overlay从70px开始
      overlayModeClass = "sidenav-only"
    } else if (!isSidebarVisible) {
      // sidebar不可见：使用full-width
      overlayModeClass = "full-width"
    }
    // 默认情况：HistorySidebar可见，从300px开始（无额外类）
  }

  return (
    <Portal.Root container={root}>
      <div className={`container-wrapper ${noBackground ? "transparent" : ""} ${overlay ? "overlay" : ""} ${overlayModeClass}`} style={{ zIndex }}>
        <DismissableLayer onPointerDownOutside={onClickOutside}>
          {children}
        </DismissableLayer>
      </div>
    </Portal.Root>
  )
}
