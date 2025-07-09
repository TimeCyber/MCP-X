import React from "react"
import { useAtom, useSetAtom } from "jotai"
import { sidebarVisibleAtom, toggleSidebarAtom } from "../atoms/sidebarState"
import { useTranslation } from "react-i18next"
import { keymapModalVisibleAtom } from "../atoms/modalState"
import ModelSelect from "./ModelSelect"
import AgentSelect from "./AgentSelect"

type Props = {
  showHelpButton?: boolean
  showModelSelect?: boolean
  showAgentSelect?: boolean
}

const Header = ({ showHelpButton = false, showModelSelect = false, showAgentSelect = false }: Props) => {
  const toggleSidebar = useSetAtom(toggleSidebarAtom)
  const { t } = useTranslation()
  const setKeymapModalVisible = useSetAtom(keymapModalVisibleAtom)
  const [isSidebarVisible] = useAtom(sidebarVisibleAtom)

  const onClose = () => {
    toggleSidebar()
  }

  return (
    <div className="app-header sidebar-visible">
      <div className="header-content">
        <div className="left-side">
          <div className="menu-container">
            {showModelSelect && <ModelSelect />}
            {/* {showAgentSelect && <AgentSelect />} */}
          </div>
        </div>
        {showHelpButton && (
          <div className="right-side">
            <button 
              className="help-btn"
              onMouseEnter={() => setKeymapModalVisible(true)}
              onMouseLeave={() => setKeymapModalVisible(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(Header) 