import React, { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Package, Shield, GitBranch, Play } from "lucide-react";
import { AIAgentCard, AgentStatus } from "./AIAgentCard";
import { MarketSentinelResponse, SignalPacket } from "../services/marketSentinel";

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
  marketSentinelData?: MarketSentinelResponse | null;
  marketSentinelLoading?: boolean;
  marketSentinelError?: string | null;
  onRunMarketSentinel?: () => void;
}

export const AgentWorkflow: React.FC<AgentWorkflowProps> = ({
  currentTime,
  isLive,
  marketSentinelData,
  marketSentinelLoading,
  marketSentinelError,
  onRunMarketSentinel,
}) => {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);

  // Helper to get Market Sentinel status based on real API data
  const getMarketSentinelStatus = (): { status: AgentStatus; lastAction: string } => {
    if (marketSentinelLoading) {
      return {
        status: "thinking",
        lastAction: "Analyzing geopolitical events and supply chain risks..."
      };
    }

    if (marketSentinelError) {
      return {
        status: "alert",
        lastAction: `Error: ${marketSentinelError}`
      };
    }

    if (marketSentinelData?.signal_packet) {
      const signal = marketSentinelData.signal_packet;
      const severityStatus: AgentStatus =
        signal.severity === 'CRITICAL' || signal.severity === 'HIGH'
          ? "alert"
          : "completed";

      return {
        status: severityStatus,
        lastAction: signal.summary || `Signal ${signal.signal_id}: ${signal.severity} severity detected`,
      };
    }

    return {
      status: "idle",
      lastAction: "Monitoring global news feeds for supply chain disruptions",
    };
  };

  useEffect(() => {
    if (!isLive) return;

    const t = currentTime % 60;

    // Use real Market Sentinel data if available, otherwise fallback to simulation
    const sentinelState = marketSentinelData || marketSentinelLoading
      ? getMarketSentinelStatus()
      : {
        status: (t > 5 && t < 15 ? "thinking" : t >= 15 ? "alert" : "idle") as AgentStatus,
        lastAction: t >= 15
          ? "Detected 47% increase in North Atlantic corridor risk indicators"
          : t > 5
            ? "Scanning Reuters, Bloomberg for supply chain disruptions..."
            : "Monitoring global news feeds for supply chain disruptions",
      };

    // Derive other agent states based on Market Sentinel results
    const hasRealSignal = marketSentinelData?.signal_packet;
    const signalSeverity = hasRealSignal ? marketSentinelData.signal_packet.severity : null;
    const isHighRisk = signalSeverity === 'CRITICAL' || signalSeverity === 'HIGH';

    setAgents([
      {
        id: "market_sentinel",
        ...sentinelState,
      },
      {
        id: "risk_hedger",
        status: hasRealSignal
          ? (isHighRisk ? "alert" : "completed")
          : (t > 15 && t < 25 ? "alert" : t >= 25 && t < 35 ? "thinking" : t >= 35 ? "completed" : "idle"),
        lastAction: hasRealSignal
          ? (isHighRisk
            ? `CRITICAL: ${marketSentinelData.signal_packet.affected_lanes.length} lanes affected`
            : "Financial exposure analysis complete")
          : (t >= 35
            ? "Recalculated portfolio exposure across alternative routes"
            : t >= 25
              ? "Analyzing financial exposure and hedging options..."
              : t > 15
                ? "CRITICAL: Elevated risk detected in primary corridor"
                : "Standing by for financial exposure analysis"),
      },
      {
        id: "logistics",
        status: hasRealSignal
          ? (isHighRisk ? "thinking" : "completed")
          : (t > 28 && t < 40 ? "thinking" : t >= 40 ? "completed" : "idle"),
        lastAction: hasRealSignal
          ? (isHighRisk
            ? "Calculating alternative routes for affected lanes..."
            : "Route optimization complete")
          : (t >= 40
            ? "Secured alternative carrier capacity for 12 high-priority shipments"
            : t > 28
              ? "Negotiating with port authorities and carriers..."
              : "Ready to optimize shipping routes"),
      },
      {
        id: "compliance",
        status: hasRealSignal
          ? "completed"
          : (t > 30 && t < 38 ? "thinking" : t >= 38 ? "completed" : "idle"),
        lastAction: hasRealSignal
          ? `Validated against ${marketSentinelData.signal_packet.entities.length} monitored entities`
          : (t >= 38
            ? "Validated alternative routes against 89 international regulations"
            : t > 30
              ? "Checking OFAC, UN sanctions lists for route compliance..."
              : "Awaiting regulatory validation requests"),
      },
      {
        id: "debate",
        status: hasRealSignal
          ? (marketSentinelData.signal_packet.confidence < 0.8 ? "thinking" : "completed")
          : (t > 40 && t < 50 ? "thinking" : t >= 50 ? "completed" : "idle"),
        lastAction: hasRealSignal
          ? (marketSentinelData.signal_packet.confidence < 0.8
            ? `Reviewing signal confidence: ${(marketSentinelData.signal_packet.confidence * 100).toFixed(0)}%`
            : "Signal validated with high confidence")
          : (t >= 50
            ? "Southern route cost estimates appear optimistic"
            : t > 40
              ? "Challenging decision logic and assumptions..."
              : "Ready for adversarial review"),
      },
    ]);
  }, [currentTime, isLive, marketSentinelData, marketSentinelLoading, marketSentinelError]);

  const getAgentById = (id: string) => agents.find(a => a.id === id);

  // Get signal severity color for display
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#ea580c';
      case 'MEDIUM': return '#ca8a04';
      case 'LOW': return '#16a34a';
      default: return '#6b7280';
    }
  };

  return (
    <div className="p-4 border-b border-[#1a2332] box-border">
      <div className="flex items-center justify-between gap-2 mb-4 box-border">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4a90e2]" />
          <h2 className="text-xs font-semibold text-white/60 tracking-wider uppercase leading-tight text-left m-0 p-0">
            Multi-Agent Collaboration
          </h2>
        </div>

        {onRunMarketSentinel && (
          <button
            onClick={onRunMarketSentinel}
            disabled={marketSentinelLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#4a90e2]/20 border border-[#4a90e2]/40 rounded-sm text-[10px] font-medium text-[#4a90e2] hover:bg-[#4a90e2]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Play className="w-3 h-3" strokeWidth={2} />
            {marketSentinelLoading ? 'Running...' : 'Run Sentinel'}
          </button>
        )}
      </div>

      {/* Signal Alert Banner */}
      {marketSentinelData?.signal_packet && (
        <div
          className="mb-4 p-3 rounded-sm border"
          style={{
            backgroundColor: `${getSeverityColor(marketSentinelData.signal_packet.severity)}15`,
            borderColor: `${getSeverityColor(marketSentinelData.signal_packet.severity)}40`,
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: `${getSeverityColor(marketSentinelData.signal_packet.severity)}30`,
                color: getSeverityColor(marketSentinelData.signal_packet.severity),
              }}
            >
              {marketSentinelData.signal_packet.severity}
            </span>
            <span className="text-[10px] text-white/40 font-mono">
              {marketSentinelData.signal_packet.signal_id}
            </span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed mb-2">
            {marketSentinelData.signal_packet.summary}
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] text-white/50">
            <span>Confidence: {(marketSentinelData.signal_packet.confidence * 100).toFixed(0)}%</span>
            <span>•</span>
            <span>Horizon: {marketSentinelData.signal_packet.expected_horizon_days} days</span>
            <span>•</span>
            <span>{marketSentinelData.signal_packet.affected_lanes.length} lanes affected</span>
          </div>
        </div>
      )}

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
