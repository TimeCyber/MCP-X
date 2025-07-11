import React from "react";
import { useAtom } from "jotai";
import { IconContext } from "react-icons";
import { navSectionAtom, NavSection } from "../atoms/navState";
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

  return (
    <IconContext.Provider value={{ style: { strokeWidth: "1.5" } }}>
      <div className="side-nav">
        <div className="nav-group top">
          {topIcons.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${active === item.id ? "active" : ""}`}
              title={item.title}
              onClick={() => setActive(item.id as NavSection)}
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
              onClick={() => setActive(item.id as NavSection)}
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