import React, { useEffect, useState } from "react";
// @ts-ignore
import { Line } from "@ant-design/charts";

interface DataPoint {
  time: string;
  risk_score: number;
  confidence: number;
}

interface LiveDataStreamProps {
    currentTime: number;
    isLive: boolean;
}

export const LiveDataStream: React.FC<LiveDataStreamProps> = ({ currentTime, isLive }) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isLive) return;

    // Trigger update on prop change
    const now = new Date();
    
    // Dynamic Script for 4:55 PM Scenario (Synced with currentTime)
    // Time starts at 0 when demo button is clicked
    let baseRisk = 20 + Math.random() * 10;
    let logMsg = "";
    
    const scenarioTime = currentTime % 60; // 60s loop logic if needed, or absolute
    
    if (scenarioTime === 5) {
        logMsg = "Signal: Vessel MSC Aries deviating from course";
        baseRisk = 45;
    } else if (scenarioTime === 12) {
        logMsg = "AI Monitor: Potential GPS Spoofing detected";
        baseRisk = 62;
    } else if (scenarioTime === 18) {
        logMsg = "Alert: Strait of Hormuz tension index rising";
        baseRisk = 78;
    } else if (scenarioTime === 24) {
        logMsg = "CRITICAL: Confirmed seizure attempt reported";
        baseRisk = 92;
    } else if (scenarioTime === 32) {
        logMsg = "Auto-Response: Rerouting via Cape of Good Hope";
        baseRisk = 55; 
    } else if (scenarioTime === 40) {
        logMsg = "Status: New route confirmed safe";
        baseRisk = 30;
    }

    if (logMsg) setLogs(prev => [now.toLocaleTimeString() + " " + logMsg, ...prev].slice(0, 5));

    setData((prev) =>
      [
        ...prev,
        {
          time: now.toLocaleTimeString(),
          risk_score: baseRisk + Math.random() * 5, 
          confidence: 0.85 + Math.random() * 0.15,
        },
      ].slice(-30)
    );  
  }, [currentTime, isLive]);

  const config = {
    data,
    xField: "time",
    yField: "risk_score",
    smooth: true,
    animation: false,
    color: (d: DataPoint) => d.risk_score > 60 ? "#FF453A" : "#0078D4", 
    lineStyle: {
      lineWidth: 3,
    },
    yAxis: {
      max: 100,
      min: 0,
      title: { text: "Risk Score", style: { fill: '#888', fontSize: 12 } },
      grid: { line: { style: { stroke: '#333' } } }, 
      label: { formatter: (v: string) => `${v}%`, style: { fill: '#888' } },
    },
    xAxis: {
        title: { text: "Time", style: { fill: '#888', fontSize: 12 } },
        label: { style: { fill: '#888' }, autoRotate: false }
    }
  };

  return (
    <div className="live-stream-panel" style={{position: 'relative'}}>
      <div className="panel-header">
        <span className="live-indicator">
          <span className="pulse-dot"></span>
          LIVE: Global Supply Chain Risk Monitor
        </span>
      </div>
      
      <div style={{height: 200}}>
         <Line {...config} />
      </div>

      <div className="event-log-overlay" style={{
          position: 'absolute', 
          top: 60, 
          right: 20, 
          width: 320, 
          background: 'rgba(0,0,0,0.85)', // Darker background for readability
          padding: 10,
          borderRadius: 4,
          fontSize: '0.8rem',
          borderLeft: '2px solid #0078D4',
          fontFamily: 'monospace' // More technical font
      }}>
          <h5 style={{margin: '0 0 5px 0', color: '#ccc', borderBottom: '1px solid #444', paddingBottom: 3}}>SYSTEM EVENT LOG</h5>
          {logs.map((log, i) => (
              <div key={i} style={{marginBottom: 3, color: log.includes('CRITICAL') ? '#ff4d4f' : '#69c0ff'}}>
                  {log}
              </div>
          ))}
          {logs.length === 0 && <div style={{color: '#666'}}>System Normal...</div>}
      </div>
    </div>
  );
};
