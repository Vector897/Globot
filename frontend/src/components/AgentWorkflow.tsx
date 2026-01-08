import React, { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Package, Shield, GitBranch } from "lucide-react";
import { AIAgentCard, AgentStatus } from "./AIAgentCard";

interface AgentState {
  id: string;
  status: AgentStatus;
  lastAction: string;
}

const INITIAL_AGENTS: AgentState[] = [
  {
    id: "market_sentinel",
    status: "idle",
    lastAction: "Monitoring global news feeds for supply chain disruptions",
  },
  {
    id: "risk_hedger",
    status: "idle",
    lastAction: "Standing by for financial exposure analysis",
  },
  {
    id: "logistics",
    status: "idle",
    lastAction: "Ready to optimize shipping routes",
  },
  {
    id: "compliance",
    status: "idle",
    lastAction: "Awaiting regulatory validation requests",
  },
  {
    id: "debate",
    status: "idle",
    lastAction: "Ready for adversarial review",
  },
];

interface AgentWorkflowProps {
  currentTime: number;
  isLive: boolean;
}

export const AgentWorkflow: React.FC<AgentWorkflowProps> = ({ currentTime, isLive }) => {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);

  useEffect(() => {
    if (!isLive) return;

    const t = currentTime % 60;

    setAgents([
      {
        id: "market_sentinel",
        status: t > 5 && t < 15 ? "thinking" : t >= 15 ? "alert" : "idle",
        lastAction: t >= 15 
          ? "Detected 47% increase in North Atlantic corridor risk indicators"
          : t > 5 
            ? "Scanning Reuters, Bloomberg for supply chain disruptions..."
            : "Monitoring global news feeds for supply chain disruptions",
      },
      {
        id: "risk_hedger",
        status: t > 15 && t < 25 ? "alert" : t >= 25 && t < 35 ? "thinking" : t >= 35 ? "completed" : "idle",
        lastAction: t >= 35
          ? "Recalculated portfolio exposure across alternative routes"
          : t >= 25
            ? "Analyzing financial exposure and hedging options..."
            : t > 15
              ? "CRITICAL: Elevated risk detected in primary corridor"
              : "Standing by for financial exposure analysis",
      },
      {
        id: "logistics",
        status: t > 28 && t < 40 ? "thinking" : t >= 40 ? "completed" : "idle",
        lastAction: t >= 40
          ? "Secured alternative carrier capacity for 12 high-priority shipments"
          : t > 28
            ? "Negotiating with port authorities and carriers..."
            : "Ready to optimize shipping routes",
      },
      {
        id: "compliance",
        status: t > 30 && t < 38 ? "thinking" : t >= 38 ? "completed" : "idle",
        lastAction: t >= 38
          ? "Validated alternative routes against 89 international regulations"
          : t > 30
            ? "Checking OFAC, UN sanctions lists for route compliance..."
            : "Awaiting regulatory validation requests",
      },
      {
        id: "debate",
        status: t > 40 && t < 50 ? "thinking" : t >= 50 ? "completed" : "idle",
        lastAction: t >= 50
          ? "Southern route cost estimates appear optimistic"
          : t > 40
            ? "Challenging decision logic and assumptions..."
            : "Ready for adversarial review",
      },
    ]);
  }, [currentTime, isLive]);

  const getAgentById = (id: string) => agents.find(a => a.id === id);

  return (
    <div className="p-4 border-b border-[#1a2332] box-border">
      <div className="flex items-center gap-2 mb-4 box-border">
        <div className="w-1.5 h-1.5 rounded-full bg-[#4a90e2]" />
        <h2 className="text-xs font-semibold text-white/60 tracking-wider uppercase leading-tight text-left m-0 p-0">
          Multi-Agent Collaboration
        </h2>
      </div>

      <div className="space-y-3 box-border">
        <AIAgentCard
          icon={AlertTriangle}
          name="Market Sentinel"
          role="Geopolitical risk detection"
          status={getAgentById("market_sentinel")?.status || "idle"}
          lastAction={getAgentById("market_sentinel")?.lastAction || ""}
        />

        <AIAgentCard
          icon={TrendingUp}
          name="Risk Hedger"
          role="Financial exposure management"
          status={getAgentById("risk_hedger")?.status || "idle"}
          lastAction={getAgentById("risk_hedger")?.lastAction || ""}
        />

        <AIAgentCard
          icon={Package}
          name="Logistics Orchestrator"
          role="Route optimization"
          status={getAgentById("logistics")?.status || "idle"}
          lastAction={getAgentById("logistics")?.lastAction || ""}
        />

        <AIAgentCard
          icon={Shield}
          name="Compliance Manager"
          role="Regulatory validation"
          status={getAgentById("compliance")?.status || "idle"}
          lastAction={getAgentById("compliance")?.lastAction || ""}
        />

        <AIAgentCard
          icon={GitBranch}
          name="Adversarial Debate"
          role="Challenge assumptions"
          status={getAgentById("debate")?.status || "idle"}
          lastAction={getAgentById("debate")?.lastAction || ""}
          isAdversarial
        />
      </div>
    </div>
  );
};
