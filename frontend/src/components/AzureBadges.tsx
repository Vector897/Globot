import React, { useEffect, useState } from "react";

interface AzureService {
  name: string;
  icon: string;
  calls: number;
  status: "active" | "inactive";
  color: string;
}

export const AzureBadges: React.FC = () => {
  const [services, setServices] = useState<AzureService[]>([
    {
      name: "Azure OpenAI",
      icon: "🤖",
      calls: 0,
      status: "active",
      color: "#0078D4",
    },
    {
      name: "Azure AI Search",
      icon: "🔍",
      calls: 0,
      status: "active",
      color: "#50E6FF",
    },
    {
      name: "Azure Cognitive",
      icon: "🧠",
      calls: 0,
      status: "active",
      color: "#00B294",
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
        setServices((prev) => [
          { ...prev[0], calls: prev[0].calls + Math.floor(Math.random() * 5) },
          { ...prev[1], calls: prev[1].calls + Math.floor(Math.random() * 2) },
          { ...prev[2], calls: prev[2].calls + Math.floor(Math.random() * 3) },
        ]);

      } catch (err) {
        console.error("Failed to fetch Azure stats:", err);
      }
    };

    const interval = setInterval(fetchStats, 5000); // 每5秒更新
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="azure-services-panel">
      <h4>⚡ Powered by Microsoft Azure</h4>
      <div className="service-badges">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="service-badge"
            style={{ borderLeftColor: svc.color }}
          >
            <span className="icon">{svc.icon}</span>
            <div className="info">
              <div className="name">{svc.name}</div>
              <div className="stats">{svc.calls} calls</div>
            </div>
            <div className={`status-dot ${svc.status}`} />
          </div>
        ))}
      </div>
    </div>
  );
};
