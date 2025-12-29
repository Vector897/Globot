import React, { useState, useEffect } from "react";
import { Globe3D, DEMO_PORTS, DEMO_ROUTES } from "../components/Globe3D";
import { LiveDataStream } from "../components/LiveDataStream";
import { AgentWorkflow } from "../components/AgentWorkflow";
import { AzureBadges } from "../components/AzureBadges";
import { useWebSocket } from "../services/websocket";
import "../styles/demo.css";

export const DemoPage: React.FC = () => {
  const [demoStarted, setDemoStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // Synchronized Demo Clock
  const { connect } = useWebSocket();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (demoStarted) {
        interval = setInterval(() => {
            setCurrentTime(prev => prev + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [demoStarted]);

  const startDemo = async () => {
    try {
        setDemoStarted(true);
        // Try calling backend to start demo, if fail, just run UI mode
        // In a real scenario, this would get the WS URL
        const response = await fetch("http://localhost:8000/api/v2/demo/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: "crisis_455pm" }),
        });
        
        if (response.ok) {
            const data = await response.json();
            connect(data.websocket_url);
        } else {
             console.warn("Backend not ready, running in UI-only mode");
        }
    } catch (e) {
        console.warn("Backend unreachable, running in UI-only mode", e);
    }
  };

  return (
    <div className="demo-page">
      <header className="demo-header">
        <h1>🛡️ Globot - The AI Shield for Global Commerce</h1>
        {!demoStarted ? (
          <button className="start-btn" onClick={startDemo}>
            ▶️ Start "4:55 PM Crisis" Demo
          </button>
        ) : (
             <span className="status-badge">🟢 Demo Running</span>
        )}
      </header>

      <div className="demo-grid">
        <div className="col-left">
          <Globe3D ports={DEMO_PORTS} routes={DEMO_ROUTES} />
          <LiveDataStream currentTime={currentTime} isLive={demoStarted} />
        </div>

        <div className="col-right">
          <AzureBadges />
          <AgentWorkflow currentTime={currentTime} isLive={demoStarted} />
        </div>
      </div>
    </div>
  );
};
