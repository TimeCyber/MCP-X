import React from "react";
import { useAgentState } from "../hooks/useAgent";

interface AgentStatusIndicatorProps {
  className?: string;
  showInMessage?: boolean;
}

const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ 
  className = "", 
  showInMessage = true 
}) => {
  const { activeAgent, selectedAgent } = useAgentState();

  if (!activeAgent) {
    return null;
  }

  return (
    <div className={`agent-status-indicator ${className} in-message`}>
      <div className="indicator-content">
        <div className="agent-info">
          <div className="agent-name">{activeAgent.name}</div>
        </div>
        <div className="status-dot">
          <div className="dot active"></div>
        </div>
      </div>
    </div>
  );
};

export default AgentStatusIndicator; 