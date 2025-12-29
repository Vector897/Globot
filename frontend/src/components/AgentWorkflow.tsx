import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Agent {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: "idle" | "working" | "complete" | "failed"; 
  lightStatus: "off" | "green" | "red" | "blue"; // For breathing light
  progress: number;
}

const AGENTS: Agent[] = [
  {
    id: "market_sentinel",
    name: "Market Sentinel",
    icon: "🔭",
    description: "Monitors global news API (Reuters, Bloomberg) for supply chain disruptions.",
    status: "idle",
    lightStatus: "green",
    progress: 0,
  },
  {
    id: "risk_hedger",
    name: "Risk Hedger",
    icon: "🛡️",
    description: "Evaluates financial exposure and triggers insurance protocols.",
    status: "idle",
    lightStatus: "green",
    progress: 0,
  },
  {
    id: "logistics",
    name: "Logistics Orchestrator",
    icon: "🚢",
    description: "Reschedules shipping routes and negotiates with port authorities.",
    status: "idle",
    lightStatus: "green",
    progress: 0,
  },
  {
    id: "compliance",
    name: "Compliance Manager",
    icon: "📋",
    description: "Verifies international trade laws and sanctions lists (OFAC, UN).",
    status: "idle",
    lightStatus: "green",
    progress: 0,
  },
  {
    id: "debate",
    name: "Adversarial Debate",
    icon: "⚖️",
    description: "Internal AI Red-Teaming to challenge decision logic before execution.",
    status: "idle",
    lightStatus: "green",
    progress: 0,
  },
];

interface AgentWorkflowProps {
    currentTime: number;
    isLive: boolean;
}

export const AgentWorkflow: React.FC<AgentWorkflowProps> = ({ currentTime, isLive }) => {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive) return;

    // Logic linking Agent Status to Scenario Time (currentTime)
    // 0-10s: Normal
    // 10s: Crisis Starts -> Market Sentinel detects
    // 24s: Critical -> Risk Hedger FAILS (Red), then recovers
    
    setAgents(prev => prev.map(agent => {
        let newStatus = agent.status;
        let newLight = agent.lightStatus;
        let newProgress = agent.progress;

        const t = currentTime % 60;

        switch (agent.id) {
            case "market_sentinel":
                if (t > 5 && t < 15) { newStatus = "working"; newLight = "blue"; newProgress = 50; }
                else if (t >= 15) { newStatus = "complete"; newLight = "green"; newProgress = 100; }
                break;
            case "risk_hedger":
                if (t > 15 && t < 25) { newStatus = "working"; newLight = "red"; newProgress = 30; } // Crisis! Red light
                else if (t >= 25 && t < 35) { newStatus = "working"; newLight = "blue"; newProgress = 80; } // Working on fix
                else if (t >= 35) { newStatus = "complete"; newLight = "green"; newProgress = 100; }
                break;
            case "logistics":
                if (t > 28 && t < 40) { newStatus = "working"; newLight = "blue"; newProgress = (t-28)*10; }
                else if (t >= 40) { newStatus = "complete"; newLight = "green"; newProgress = 100; }
                break;
            case "compliance":
                // Runs parallel to logistics
                if (t > 30 && t < 38) { newStatus = "working"; newLight = "blue"; newProgress = 60; }
                else if (t >= 38) { newStatus = "complete"; newLight = "green"; newProgress = 100; }
                break;
            case "debate":
                // Final check
                if (t > 40 && t < 50) { newStatus = "working"; newLight = "blue"; newProgress = 90; }
                else if (t >= 50) { newStatus = "complete"; newLight = "green"; newProgress = 100; }
                break;
        }

        return { ...agent, status: newStatus as any, lightStatus: newLight as any, progress: newProgress };
    }));

  }, [currentTime, isLive]);

  return (
    <div className="agent-workflow">
      <h3>Multi-Agent Collaboration</h3>
      <div className="agent-cards">
        {agents.map((agent) => (
          <div 
             key={agent.id} 
             className="agent-card-container" 
             onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
             style={{ cursor: 'pointer', marginBottom: 10, background: '#1e1e1e', padding: 10, borderRadius: 6, border: '1px solid #333' }}
          >
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem' }}>{agent.icon}</span>
                    <span style={{ fontWeight: 'bold', color: '#eee' }}>{agent.name}</span>
                </div>
                
                {/* Breathing Light */}
                <div className={`status-light ${agent.lightStatus}`} style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: agent.lightStatus === 'green' ? '#10B981' : agent.lightStatus === 'red' ? '#EF4444' : agent.lightStatus === 'blue' ? '#3B82F6' : '#555',
                    boxShadow: agent.lightStatus !== 'off' ? `0 0 10px ${agent.lightStatus === 'green' ? '#10B981' : agent.lightStatus === 'red' ? '#EF4444' : '#3B82F6'}` : 'none',
                    animation: agent.lightStatus !== 'off' ? 'pulse 2s infinite' : 'none'
                }}></div>
             </div>

             {/* Progress Bar (Mini) */}
             <div style={{ height: 4, background: '#333', marginTop: 8, borderRadius: 2, overflow: 'hidden' }}>
                 <div style={{ height: '100%', width: `${agent.progress}%`, background: agent.lightStatus === 'red' ? '#EF4444' : '#0078D4', transition: 'width 0.5s' }}></div>
             </div>

             {/* Description (Collapsible) */}
             {expandedId === agent.id && (
                 <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#aaa', borderTop: '1px solid #333', paddingTop: 5 }}>
                     {agent.description}
                 </div>
             )}
             
             {/* Status Text (Always visible but small) */}
             <div style={{ marginTop: 4, fontSize: '0.75rem', color: '#666' }}>
                  {agent.status === 'working' ? 'Working...' : agent.status === 'complete' ? 'Completed' : 'Idle'}
             </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes pulse {
            0% { opacity: 0.6; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1.1); }
            100% { opacity: 0.6; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
};
