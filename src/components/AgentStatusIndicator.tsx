import React from "react";
import { useAgentState } from "../hooks/useAgent";

interface AgentStatusIndicatorProps {
  className?: string;
  showInMessage?: boolean;
}

const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ 
  className = "", 
  showInMessage = false 
}) => {
  const { activeAgent, selectedAgent } = useAgentState();

  if (!activeAgent) {
    return null;
  }

  return (
    <div className={`agent-status-indicator ${className} ${showInMessage ? "in-message" : ""}`}>
      <div className="indicator-content">
        <div className="agent-avatar">
          {activeAgent.avatar ? (
            <img src={activeAgent.avatar} alt={activeAgent.name} />
          ) : (
            <div className="avatar-placeholder">
              {activeAgent.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="agent-info">
          <div className="agent-name">{activeAgent.name}</div>
          {!showInMessage && (
            <div className="agent-role">
              {selectedAgent?.systemRole || "智能助手"}
            </div>
          )}
        </div>
        <div className="status-dot">
          <div className="dot active"></div>
        </div>
      </div>
      
      {selectedAgent?.openSay && !showInMessage && (
        <div className="agent-greeting">
          <div className="greeting-text">
            {selectedAgent.openSay}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentStatusIndicator; 