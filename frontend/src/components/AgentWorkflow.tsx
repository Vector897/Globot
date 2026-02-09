import React, { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Package, Shield, GitBranch, Play } from "lucide-react";
import { AIAgentCard, AgentStatus } from "./AIAgentCard";
import { MarketSentinelResponse } from "../services/marketSentinel";
import { RiskAssessment, HedgeRecommendation } from "../services/hedgeApi";

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
  selectedRoute?: { name: string; distance: number; estimatedTime: number; riskLevel: string; waypointNames: string[]; description: string } | null;
  // Hedge data
  hedgeRiskData?: RiskAssessment | null;
  hedgeRecommendation?: HedgeRecommendation | null;
  hedgeLoading?: boolean;
  hedgeError?: string | null;
  onRunHedge?: () => void;
  // CoT / Debate / Execution
  isCotActive?: boolean;
  debateCount?: number;
  executionPhase?: 'pending' | 'executing' | 'complete';
}

export const AgentWorkflow: React.FC<AgentWorkflowProps> = ({ 
  currentTime, 
  isLive,
  marketSentinelData,
  marketSentinelLoading,
  marketSentinelError,
  onRunMarketSentinel,
  selectedRoute,
  hedgeRiskData,
  hedgeRecommendation,
  hedgeLoading,
  hedgeError,
  onRunHedge,
  isCotActive,
  debateCount = 0,
  executionPhase = 'pending',
}) => {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<"market_sentinel" | "risk_hedger" | null>(null);

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

  // Helper to get Risk Hedger status from real hedge API data
  const getHedgeStatus = (): { status: AgentStatus; lastAction: string } => {
    if (hedgeLoading) {
      return {
        status: "thinking",
        lastAction: "Analyzing financial exposure and hedging options...",
      };
    }

    if (hedgeError) {
      return {
        status: "alert",
        lastAction: `Error: ${hedgeError}`,
      };
    }

    if (hedgeRecommendation) {
      return {
        status: "completed",
        lastAction: `Strategy ready: ${hedgeRecommendation.regime} regime · Fuel hedge ${hedgeRecommendation.fuel_hedging?.hedge_ratio || 'N/A'}`,
      };
    }

    if (hedgeRiskData) {
      const isUrgent = hedgeRiskData.urgency === 'CRITICAL' || hedgeRiskData.urgency === 'HIGH';
      return {
        status: isUrgent ? "alert" : "completed",
        lastAction: `${hedgeRiskData.urgency}: $${(hedgeRiskData.total_var_95_usd / 1000).toFixed(0)}K VaR · ${hedgeRiskData.market_regime} regime`,
      };
    }

    return {
      status: "idle",
      lastAction: "Standing by for financial exposure analysis",
    };
  };

  // Helper to get Logistics Orchestrator status from route + execution phase
  const getLogisticsStatus = (): { status: AgentStatus; lastAction: string } => {
    if (executionPhase === 'executing') {
      return {
        status: "thinking",
        lastAction: "Executing route optimization and carrier allocation...",
      };
    }

    if (executionPhase === 'complete') {
      return {
        status: "completed",
        lastAction: selectedRoute
          ? `Route optimized: ${selectedRoute.name} (${selectedRoute.distance.toLocaleString()} nm)`
          : "Route execution complete",
      };
    }

    if (selectedRoute) {
      return {
        status: "completed",
        lastAction: `Active route: ${selectedRoute.name} · ~${selectedRoute.estimatedTime}d`,
      };
    }

    return {
      status: "idle",
      lastAction: "Ready to optimize shipping routes",
    };
  };

  // Helper to get Adversarial Debate status from CoT/debate events
  const getDebateStatus = (): { status: AgentStatus; lastAction: string } => {
    if (debateCount > 0 && isCotActive) {
      return {
        status: "thinking",
        lastAction: `Reviewing ${debateCount} debate exchange${debateCount > 1 ? 's' : ''} — challenging assumptions...`,
      };
    }

    if (debateCount > 0 && !isCotActive) {
      return {
        status: "completed",
        lastAction: `Completed ${debateCount} adversarial review${debateCount > 1 ? 's' : ''}`,
      };
    }

    if (isCotActive) {
      return {
        status: "thinking",
        lastAction: "CoT active — preparing adversarial challenges...",
      };
    }

    // Fallback: derive from Market Sentinel confidence
    if (marketSentinelData?.signal_packet) {
      const confidence = marketSentinelData.signal_packet.confidence;
      if (confidence < 0.8) {
        return {
          status: "thinking",
          lastAction: `Reviewing signal confidence: ${(confidence * 100).toFixed(0)}%`,
        };
      }
      return {
        status: "completed",
        lastAction: "Signal validated with high confidence",
      };
    }

    return {
      status: "idle",
      lastAction: "Ready for adversarial review",
    };
  };

  useEffect(() => {
    if (!isLive) return;

    const t = currentTime % 60;
    const isSentinelSelected = selectedAgentId === "market_sentinel";
    const isHedgeSelected = selectedAgentId === "risk_hedger";
    
    const sentinelState = isSentinelSelected
      ? (
          marketSentinelData || marketSentinelLoading
      ? getMarketSentinelStatus()
      : {
          status: (t > 5 && t < 15 ? "thinking" : t >= 15 ? "alert" : "idle") as AgentStatus,
          lastAction: t >= 15 
            ? "Detected 47% increase in North Atlantic corridor risk indicators"
            : t > 5 
              ? "Scanning Reuters, Bloomberg for supply chain disruptions..."
              : "Monitoring global news feeds for supply chain disruptions",
              }
        )
      : {
          status: "idle" as AgentStatus,
          lastAction: "Select Market Sentinel to run",
        };

    // Derive other agent states — prefer real data, fallback to timer simulation
    const hasRealSignal = marketSentinelData?.signal_packet;
    const hasRealHedge = hedgeRiskData || hedgeRecommendation || hedgeLoading || hedgeError;

    const hedgeState = isHedgeSelected
      ? (
          hasRealHedge
      ? getHedgeStatus()
      : {
          status: (hasRealSignal
            ? ((hasRealSignal && (marketSentinelData!.signal_packet.severity === 'CRITICAL' || marketSentinelData!.signal_packet.severity === 'HIGH')) ? "alert" : "completed")
            : (t > 15 && t < 25 ? "alert" : t >= 25 && t < 35 ? "thinking" : t >= 35 ? "completed" : "idle")
          ) as AgentStatus,
          lastAction: hasRealSignal
            ? ((marketSentinelData!.signal_packet.severity === 'CRITICAL' || marketSentinelData!.signal_packet.severity === 'HIGH')
                ? `CRITICAL: ${marketSentinelData!.signal_packet.affected_lanes.length} lanes affected`
                : "Financial exposure analysis complete")
            : (t >= 35
                ? "Recalculated portfolio exposure across alternative routes"
                : t >= 25
                  ? "Analyzing financial exposure and hedging options..."
                  : t > 15
                    ? "CRITICAL: Elevated risk detected in primary corridor"
                    : "Standing by for financial exposure analysis"),
              }
        )
      : {
          status: "idle" as AgentStatus,
          lastAction: "Select Risk Hedger to run",
        };

    // Logistics: real data if execution phase or route is set
    const hasRealLogistics = executionPhase !== 'pending' || selectedRoute;
    const logisticsState = hasRealLogistics
      ? getLogisticsStatus()
      : {
          status: (t > 28 && t < 40 ? "thinking" : t >= 40 ? "completed" : "idle") as AgentStatus,
          lastAction: t >= 40
            ? "Secured alternative carrier capacity for 12 high-priority shipments"
            : t > 28
              ? "Negotiating with port authorities and carriers..."
              : "Ready to optimize shipping routes",
        };

    // Compliance: if we have a real signal, use entity count; else timer
    const complianceState = hasRealSignal
      ? {
          status: "completed" as AgentStatus,
          lastAction: `Validated against ${marketSentinelData!.signal_packet.entities.length} monitored entities`,
        }
      : {
          status: (t > 30 && t < 38 ? "thinking" : t >= 38 ? "completed" : "idle") as AgentStatus,
          lastAction: t >= 38
            ? "Validated alternative routes against 89 international regulations"
            : t > 30
              ? "Checking OFAC, UN sanctions lists for route compliance..."
              : "Awaiting regulatory validation requests",
        };

    // Debate: real data if CoT or debates exist
    const hasRealDebate = isCotActive || debateCount > 0;
    const debateState = hasRealDebate
      ? getDebateStatus()
      : hasRealSignal
        ? {
            status: (marketSentinelData!.signal_packet.confidence < 0.8 ? "thinking" : "completed") as AgentStatus,
            lastAction: marketSentinelData!.signal_packet.confidence < 0.8
              ? `Reviewing signal confidence: ${(marketSentinelData!.signal_packet.confidence * 100).toFixed(0)}%`
              : "Signal validated with high confidence",
          }
        : {
            status: (t > 40 && t < 50 ? "thinking" : t >= 50 ? "completed" : "idle") as AgentStatus,
            lastAction: t >= 50
              ? "Southern route cost estimates appear optimistic"
              : t > 40
                ? "Challenging decision logic and assumptions..."
                : "Ready for adversarial review",
          };

    setAgents([
      { id: "market_sentinel", ...sentinelState },
      { id: "risk_hedger", ...hedgeState },
      { id: "logistics", ...logisticsState },
      { id: "compliance", ...complianceState },
      { id: "debate", ...debateState },
    ]);
  }, [currentTime, isLive, marketSentinelData, marketSentinelLoading, marketSentinelError, hedgeRiskData, hedgeRecommendation, hedgeLoading, hedgeError, isCotActive, debateCount, executionPhase, selectedRoute, selectedAgentId]);

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
        
        <div className="flex items-center gap-1.5">
          {onRunMarketSentinel && (
            <button
              onClick={() => {
                if (selectedAgentId !== "market_sentinel") {
                  setSelectedAgentId("market_sentinel");
                }
                onRunMarketSentinel();
              }}
              disabled={marketSentinelLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#4a90e2]/20 border border-[#4a90e2]/40 rounded-sm text-[10px] font-medium text-[#4a90e2] hover:bg-[#4a90e2]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Play className="w-3 h-3" strokeWidth={2} />
              {marketSentinelLoading ? 'Running...' : 'Run Sentinel'}
            </button>
          )}
          {onRunHedge && (
            <button
              onClick={() => {
                if (selectedAgentId !== "risk_hedger") {
                  setSelectedAgentId("risk_hedger");
                }
                onRunHedge();
              }}
              disabled={hedgeLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#10b981]/20 border border-[#10b981]/40 rounded-sm text-[10px] font-medium text-[#10b981] hover:bg-[#10b981]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <TrendingUp className="w-3 h-3" strokeWidth={2} />
              {hedgeLoading ? 'Running...' : 'Run Hedge'}
            </button>
          )}
        </div>
      </div>

      {/* Active Route Context */}
      {selectedRoute && (
        <div className="mb-4 p-2.5 rounded-sm border border-[#1a2332] bg-[#0f1621]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedRoute.riskLevel === 'high' ? '#c94444' : selectedRoute.riskLevel === 'medium' ? '#e8a547' : '#5a9a7a' }} />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Active Route</span>
          </div>
          <p className="text-xs text-white/80 font-medium mb-1">{selectedRoute.name}</p>
          <div className="flex items-center gap-3 text-[10px] text-white/50">
            <span>{selectedRoute.distance.toLocaleString()} nm</span>
            <span>~{selectedRoute.estimatedTime}d</span>
            <span className={`uppercase font-bold ${selectedRoute.riskLevel === 'high' ? 'text-[#c94444]' : selectedRoute.riskLevel === 'medium' ? 'text-[#e8a547]' : 'text-[#5a9a7a]'}`}>
              {selectedRoute.riskLevel} risk
            </span>
          </div>
        </div>
      )}

      {/* Signal Alert Banner */}
      {selectedAgentId === "market_sentinel" && marketSentinelData?.signal_packet && (
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

      {/* Hedge Data Banner */}
      {selectedAgentId === "risk_hedger" && hedgeRiskData && (
        <div 
          className="mb-4 p-3 rounded-sm border"
          style={{
            backgroundColor: hedgeRiskData.urgency === 'CRITICAL' ? '#dc262615' : '#10b98115',
            borderColor: hedgeRiskData.urgency === 'CRITICAL' ? '#dc262640' : '#10b98140',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span 
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: hedgeRiskData.urgency === 'CRITICAL' ? '#dc262630' : '#10b98130',
                color: hedgeRiskData.urgency === 'CRITICAL' ? '#dc2626' : '#10b981',
              }}
            >
              {hedgeRiskData.urgency} · {hedgeRiskData.market_regime}
            </span>
            <span className="text-[10px] text-white/40 font-mono">
              Risk Hedge
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-white/60">
            <span>Exposure: ${(hedgeRiskData.total_exposure_usd / 1_000_000).toFixed(1)}M</span>
            <span>•</span>
            <span>VaR 95%: ${(hedgeRiskData.total_var_95_usd / 1_000).toFixed(0)}K</span>
          </div>
          {hedgeRecommendation && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-[10px] text-white/50">
                Strategy: <span className="text-white/70">{hedgeRecommendation.regime} regime</span>
                {hedgeRecommendation.fuel_hedging && (
                  <> · Fuel hedge: <span className="text-white/70">{hedgeRecommendation.fuel_hedging.hedge_ratio}</span></>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 box-border">
        <button
          type="button"
          onClick={() => setSelectedAgentId("market_sentinel")}
          className={`w-full text-left rounded-sm transition-all ${selectedAgentId === "market_sentinel" ? "ring-1 ring-[#4a90e2]/70" : "ring-1 ring-transparent hover:ring-[#4a90e2]/30"}`}
        >
        <AIAgentCard
          icon={AlertTriangle}
          name="Market Sentinel"
          role="Geopolitical risk detection"
          status={getAgentById("market_sentinel")?.status || "idle"}
          lastAction={getAgentById("market_sentinel")?.lastAction || ""}
        />
        </button>

        <button
          type="button"
          onClick={() => setSelectedAgentId("risk_hedger")}
          className={`w-full text-left rounded-sm transition-all ${selectedAgentId === "risk_hedger" ? "ring-1 ring-[#10b981]/70" : "ring-1 ring-transparent hover:ring-[#10b981]/30"}`}
        >
        <AIAgentCard
          icon={TrendingUp}
          name="Risk Hedger"
          role="Financial exposure management"
          status={getAgentById("risk_hedger")?.status || "idle"}
          lastAction={getAgentById("risk_hedger")?.lastAction || ""}
        />
        </button>
       
      </div>
    </div>
  );
};
