import React from "react";
import { useAtom, useSetAtom } from "jotai";
import { IconContext } from "react-icons";
import { navSectionAtom, NavSection } from "../atoms/navState";
import { closeAllOverlaysAtom } from "../atoms/layerState";
import {
  AiOutlineMessage,
  AiFillMessage,
  AiOutlineRobot,
  AiFillRobot,
  AiOutlineTool,
  AiFillTool,
  AiOutlineBarChart,
  AiOutlineSetting,
  AiFillSetting
} from "react-icons/ai";

const topIcons = [
  { id: "chat", title: "对话", label: "对话", icon: <AiOutlineMessage />, activeIcon: <AiFillMessage /> },
  { id: "agent", title: "智能体", label: "智能体", icon: <AiOutlineRobot />, activeIcon: <AiFillRobot /> }
];

const bottomIcons = [
  { id: "tools", title: "工具", label: "工具", icon: <AiOutlineTool />, activeIcon: <AiFillTool /> },
  { id: "model", title: "模型", label: "模型", icon: <AiOutlineBarChart />, activeIcon: <AiOutlineBarChart /> },
  { id: "system", title: "系统", label: "系统", icon: <AiOutlineSetting />, activeIcon: <AiFillSetting /> }
];

const SideNav: React.FC = () => {
  const [active, setActive] = useAtom(navSectionAtom);
  const closeAllOverlays = useSetAtom(closeAllOverlaysAtom);

  const handleNavClick = (navId: NavSection) => {
    // 如果点击的是chat或agent，关闭所有overlay
    if (navId === "chat" || navId === "agent") {
      closeAllOverlays();
    }
    setActive(navId);
  };

  return (
    <IconContext.Provider value={{ style: { strokeWidth: "1.5" } }}>
      <div className="side-nav">
        <div className="nav-group top">
          {topIcons.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${active === item.id ? "active" : ""}`}
              title={item.title}
              onClick={() => handleNavClick(item.id as NavSection)}
            >
              <div className="nav-icon">
                {active === item.id ? item.activeIcon : item.icon}
              </div>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="nav-group bottom">
          {bottomIcons.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${active === item.id ? "active" : ""}`}
              title={item.title}
              onClick={() => handleNavClick(item.id as NavSection)}
            >
              <div className="nav-icon">
                {active === item.id ? item.activeIcon : item.icon}
              </div>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </IconContext.Provider>
  );
};

export default SideNav; 