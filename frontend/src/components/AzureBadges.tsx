import React, { useEffect, useState } from "react";
import { Brain, Search, Cog } from "lucide-react";
import { AIAgentCard, AgentStatus } from "./AIAgentCard";

interface AzureServiceState {
  id: string;
  status: AgentStatus;
  lastAction: string;
  calls: number;
}

export const AzureBadges: React.FC = () => {
  const [services, setServices] = useState<AzureServiceState[]>([
    {
      id: "openai",
      status: "idle",
      lastAction: "Ready to analyze trade documents",
      calls: 0,
    },
    {
      id: "search",
      status: "idle",
      lastAction: "Standing by for intelligence queries",
      calls: 0,
    },
    {
      id: "cognitive",
      status: "idle",
      lastAction: "Pattern recognition engine ready",
      calls: 0,
    },
  ]);

  // 定期更新统计数据
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Mock API call or real endpoint
        // const response = await fetch("http://localhost:8000/api/v2/azure/stats");
        // const data = await response.json();
        
        // Mock data update
        setServices((prev) => {
          const newCalls = [
            prev[0].calls + Math.floor(Math.random() * 5),
            prev[1].calls + Math.floor(Math.random() * 2),
            prev[2].calls + Math.floor(Math.random() * 3),
          ];

          return [
            {
              ...prev[0],
              calls: newCalls[0],
              status: newCalls[0] > 20 ? "completed" : newCalls[0] > 5 ? "thinking" : "idle",
              lastAction: newCalls[0] > 20
                ? `Analyzed ${Math.floor(newCalls[0] * 12)} trade documents for regulatory compliance`
                : newCalls[0] > 5
                  ? "Processing trade document analysis..."
                  : "Ready to analyze trade documents",
            },
            {
              ...prev[1],
              calls: newCalls[1],
              status: newCalls[1] > 15 ? "completed" : "thinking",
              lastAction: newCalls[1] > 15
                ? `Indexed geopolitical news from ${1200 + newCalls[1] * 10}+ sources`
                : `Indexing geopolitical news from ${1200 + newCalls[1] * 10}+ sources`,
            },
            {
              ...prev[2],
              calls: newCalls[2],
              status: newCalls[2] > 18 ? "completed" : newCalls[2] > 8 ? "thinking" : "idle",
              lastAction: newCalls[2] > 18
                ? `Identified ${Math.min(newCalls[2], 5)} historical precedents for similar crisis events`
                : newCalls[2] > 8
                  ? "Scanning historical data for pattern matches..."
                  : "Pattern recognition engine ready",
            },
          ];
        });
      } catch (err) {
        console.error("Failed to fetch Azure stats:", err);
      }
    };

    const interval = setInterval(fetchStats, 5000); // 每5秒更新
    return () => clearInterval(interval);
  }, []);

  const getServiceById = (id: string) => services.find((s) => s.id === id);

  return (
    <div className="p-4 border-b border-[#1a2332] box-border">
      <div className="flex items-center gap-2 mb-4 box-border">
        <div className="w-1.5 h-1.5 rounded-full bg-[#0078d4]" />
        <h2 className="text-xs font-semibold text-white/60 tracking-wider uppercase leading-tight text-left m-0 p-0">
          Azure OpenAI Agents
        </h2>
      </div>

      <div className="space-y-3 box-border">
        <AIAgentCard
          icon={Brain}
          name="Azure OpenAI"
          role="Primary reasoning engine"
          status={getServiceById("openai")?.status || "idle"}
          lastAction={getServiceById("openai")?.lastAction || ""}
        />

        <AIAgentCard
          icon={Search}
          name="Azure AI Search"
          role="Real-time intelligence"
          status={getServiceById("search")?.status || "thinking"}
          lastAction={getServiceById("search")?.lastAction || ""}
        />

        <AIAgentCard
          icon={Cog}
          name="Azure Cognitive"
          role="Pattern recognition"
          status={getServiceById("cognitive")?.status || "idle"}
          lastAction={getServiceById("cognitive")?.lastAction || ""}
        />
      </div>
    </div>
  );
};
