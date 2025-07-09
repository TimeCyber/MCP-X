import React from "react";
import { useAtom } from "jotai";
import { navSectionAtom, NavSection } from "../atoms/navState";

const topIcons = [
  { id: "chat", title: "对话", svg: <span>💬</span> },
  { id: "agent", title: "智能体", svg: <span>🤖</span> }
]

const bottomIcons = [
  { id: "tools", title: "工具", svg: <span>🛠️</span> },
  { id: "model", title: "模型", svg: <span>📊</span> },
  { id: "system", title: "系统", svg: <span>⚙️</span> }
];

const SideNav: React.FC = () => {
  const [active, setActive] = useAtom(navSectionAtom);
  return (
    <div className="side-nav">
      <div className="nav-group top">
        {topIcons.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${active === item.id ? "active" : ""}`}
            title={item.title}
            onClick={() => setActive(item.id as NavSection)}
          >
            {item.svg}
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
            {item.svg}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SideNav; 