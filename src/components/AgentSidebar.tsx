import React, { useEffect } from "react"
import { useAgent } from "../hooks/useAgent"
import "../styles/components/_AgentSidebar.scss"

const AgentSidebar: React.FC = () => {
  const { fetchAgentList, filteredAgents, activeAgent, searchAgents, searchKeyword, selectAgent, activateAgent } = useAgent()

  useEffect(() => {
    fetchAgentList()
  }, [fetchAgentList])

  const getAvatarUrl = (url: string) => {
    if (!url) return ""
    if (url.startsWith("http")) return url
    return `https://www.mcp-x.com/prod-api/${url.replace(/^\/+/, "")}`
  }

  return (
    <div className="agent-sidebar">
      <div className="sidebar-header">智能体列表</div>
      <div className="search-box">
        <input
          type="text"
          placeholder="搜索智能体..."
          value={searchKeyword}
          onChange={(e) => searchAgents(e.target.value)}
        />
      </div>
      <div className="agent-list">
        {filteredAgents.map(agent => (
          <div
            key={agent.id}
            className={`agent-item ${activeAgent?.id === agent.id ? "active" : ""}`}
            onClick={async () => {
              try {
                selectAgent(agent.id)
                await activateAgent(agent.id)
              } catch (err) {
                console.error("Failed to activate agent", err)
              }
            }}
          >
            <div className="agent-avatar">
              {agent.avatar ? <img src={getAvatarUrl(agent.avatar)} alt={agent.name} /> : <span>🤖</span>}
            </div>
            <div className="agent-info">
              <div className="agent-name">{agent.name}</div>
              <div className="agent-description">{agent.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AgentSidebar 