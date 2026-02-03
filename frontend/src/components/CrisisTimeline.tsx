import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, CheckCircle2, Ship as ShipIcon } from 'lucide-react';
import React from 'react';
import { MOCK_SHIPS, Ship } from '../utils/shipData';
import { formatUTCTimeShort, getUTCTimestamp } from '../utils/timeUtils';

interface TimelineEvent {
  id: string;
  time: string;
  message: string;
  type: 'critical' | 'info' | 'success';
}

interface CrisisTimelineProps {
  executionPhase?: 'pending' | 'executing' | 'complete';
  onShipClick?: (ship: Ship) => void;
}

// Shanghai → Hamburg Demo Scenario (~2 min, 35 events)
// Phase 1-4: Pre-execution events (28 events)
// Phase 5: Post-decision execution events (7 events) - triggered by workflow approval

// Phases 1-4: Events that play before decision approval
const preExecutionMessages = [
  // === Phase 1: 平静无事 (Calm operations - Suez Canal route planned) ===
  { message: 'Shanghai → Hamburg: Vessel "EVER ALOT" departed Yangshan Deep Water Port', type: 'success' as const },
  { message: 'Cargo manifest validated: 4,200 TEU containers, high-value electronics shipment', type: 'info' as const },
  { message: 'Route: Suez Canal (Red Sea) - shortest path. Transit scheduled Day 18', type: 'success' as const },
  { message: 'Market Sentinel monitoring 156 global risk indicators - all within normal range', type: 'info' as const },
  { message: 'Azure AI Search indexed 2,847 shipping intelligence reports. No anomalies detected', type: 'info' as const },
  { message: 'Weather forecast: Favorable conditions through Indian Ocean corridor', type: 'success' as const },
  { message: 'Vessel on course via Suez Canal route. ETA Hamburg: 28 days. Status: NOMINAL', type: 'success' as const },
  
  // === Phase 2: 预测爆发危机 (Crisis prediction - Suez route at risk) ===
  { message: '⚡ Market Sentinel: Unusual naval activity detected near Suez Canal / Red Sea region', type: 'info' as const },
  { message: 'Azure OpenAI analyzing 3,421 intelligence reports from past 72 hours', type: 'info' as const },
  { message: 'Social media sentiment analysis: Geopolitical tension keywords spiking (+340%)', type: 'info' as const },
  { message: '⚠️ Predictive model: 67% probability Suez Canal route disrupted within 5 days', type: 'critical' as const },
  { message: 'Risk Hedger: Suez Canal (Red Sea) route alert level → ELEVATED', type: 'critical' as const },
  { message: 'Azure Cognitive: Pattern matching 2024 Houthi crisis precedent (87% similarity)', type: 'info' as const },
  { message: '⚠️ Fleet anomaly: 12 vessels diverted from Suez route in past 6 hours', type: 'critical' as const },
  
  // === Phase 3: 生成替代方案 (Generate alternative plans - aligned with Available Routes) ===
  { message: 'Logistics Orchestrator analyzing 3 alternative routes from Available Routes panel', type: 'info' as const },
  { message: '📍 Cape of Good Hope (Standard): Shanghai → Singapore → Cape Town → Rotterdam → Hamburg', type: 'info' as const },
  { message: '📍 Panama Canal (Westbound): Shanghai → Pacific → Panama → Atlantic → Hamburg (+18 days)', type: 'info' as const },
  { message: '📍 Northern Sea Route (Arctic): REJECTED - Seasonal route impassable in current conditions', type: 'critical' as const },
  { message: 'Adversarial Debate: Cape route optimal - LOW RISK, +12 days, $180K additional fuel cost', type: 'info' as const },
  { message: 'Azure AI Search: Cape of Good Hope 94% reliability during Red Sea tensions (2015-2024 data)', type: 'success' as const },
  { message: '✅ Route selected: Cape of Good Hope (Standard). Pre-booking Singapore & Cape Town berths', type: 'success' as const },
  
  // === Phase 4: 真实危机爆发 (Real crisis outbreak - Suez Canal route compromised) ===
  { message: '🚨 BREAKING: Commercial vessel struck by missile in Bab el-Mandeb Strait', type: 'critical' as const },
  { message: '🚨 Suez Canal (Red Sea) route: Multiple shipping companies suspending transit', type: 'critical' as const },
  { message: '🚨 Suez Canal Authority: All northbound traffic SUSPENDED until further notice', type: 'critical' as const },
  { message: 'Insurance: Suez Canal route declared WAR RISK zone, premiums +500%', type: 'critical' as const },
  { message: 'Market impact: Asia-Europe freight rates surging +$2,400/TEU in 4 hours', type: 'critical' as const },
  { message: '"EVER ALOT" position: Approaching Singapore, 72 hours before Suez decision point', type: 'info' as const },
  { message: '⏳ AWAITING DECISION: Recommend switch to Cape of Good Hope route. Approval required.', type: 'critical' as const },
];

// Phase 5: Events that play ONLY after decision agent approval
const executionMessages = [
  { message: '✅ DECISION APPROVED: Switching to Cape of Good Hope (Standard) route', type: 'success' as const },
  { message: 'Captain notified. Course adjustment: Singapore → Cape Town → Rotterdam → Hamburg', type: 'info' as const },
  { message: 'Singapore berth confirmed for Day 8. Cape Town refueling scheduled Day 22', type: 'success' as const },
  { message: 'Compliance Manager: Customs documentation updated for South Africa & EU transit', type: 'success' as const },
  { message: 'Customer notification sent: New ETA Hamburg 40 days (+12 days, avoiding Red Sea risk)', type: 'info' as const },
  { message: 'Risk level downgraded: HIGH → LOW. Suez Canal route avoided successfully', type: 'success' as const },
  { message: '✅ Crisis averted. Estimated savings vs Suez exposure: $3.8M. Vessel safe on Cape route', type: 'success' as const },
];

export function CrisisTimeline({ executionPhase = 'pending', onShipClick }: CrisisTimelineProps) {
  const [riskData, setRiskData] = useState([
    { time: '09:00', risk: 15 },
    { time: '09:30', risk: 22 },
    { time: '10:00', risk: 35 },
    { time: '10:30', risk: 58 },
    { time: '11:00', risk: 72 },
    { time: '11:30', risk: 85 },
    { time: '12:00', risk: 68 },
    { time: '12:30', risk: 52 },
    { time: '13:00', risk: 38 },
  ]);

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [preExecIndex, setPreExecIndex] = useState(0);
  const [execIndex, setExecIndex] = useState(0);
  const [hasTriggeredExecution, setHasTriggeredExecution] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Continuous chart updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRiskData((prev) => {
        const newData = [...prev];
        newData.shift(); // Remove first item
        
        // Calculate new risk value with some randomness
        const lastRisk = newData[newData.length - 1].risk;
        const change = (Math.random() - 0.5) * 20;
        const newRisk = Math.max(10, Math.min(95, lastRisk + change));
        
        // Generate new time
        const lastTime = newData[newData.length - 1].time;
        const [hours, minutes] = lastTime.split(':').map(Number);
        const newMinutes = (minutes + 30) % 60;
        const newHours = minutes + 30 >= 60 ? (hours + 1) % 24 : hours;
        const newTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        
        newData.push({ time: newTime, risk: newRisk });
        return newData;
      });
    }, 4000); // Update every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // Trigger execution messages when decision is approved
  useEffect(() => {
    if ((executionPhase === 'executing' || executionPhase === 'complete') && !hasTriggeredExecution) {
      setHasTriggeredExecution(true);
      setExecIndex(0); // Start execution messages from beginning
    }
  }, [executionPhase, hasTriggeredExecution]);

  // Pre-execution event log updates (Phases 1-4)
  useEffect(() => {
    // Stop pre-execution messages once we've shown them all or execution started
    if (preExecIndex >= preExecutionMessages.length) return;

    const interval = setInterval(() => {
      // Use UTC time for consistency
      const time = formatUTCTimeShort().slice(0, 5); // HH:MM format
      
      const newEvent: TimelineEvent = {
        id: getUTCTimestamp().toString(),
        time: time + ' UTC',
        ...preExecutionMessages[preExecIndex],
      };

      setEvents((prev) => [newEvent, ...prev].slice(0, 10));
      setPreExecIndex((prev) => prev + 1);
    }, 3500); // New event every 3.5 seconds

    return () => clearInterval(interval);
  }, [preExecIndex]);

  // Execution event log updates (Phase 5) - only after decision approval
  useEffect(() => {
    if (!hasTriggeredExecution) return;
    if (execIndex >= executionMessages.length) return;

    const interval = setInterval(() => {
      // Use UTC time for consistency
      const time = formatUTCTimeShort().slice(0, 5); // HH:MM format
      
      const newEvent: TimelineEvent = {
        id: `exec-${getUTCTimestamp()}`,
        time: time + ' UTC',
        ...executionMessages[execIndex],
      };

      setEvents((prev) => [newEvent, ...prev].slice(0, 10));
      setExecIndex((prev) => prev + 1);
    }, 2500); // Execution events slightly faster (2.5s)

    return () => clearInterval(interval);
  }, [hasTriggeredExecution, execIndex]);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'critical':
        return AlertTriangle;
      case 'success':
        return CheckCircle2;
      default:
        return Info;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'critical':
        return '#c94444';
      case 'success':
        return '#5a9a7a';
      default:
        return '#4a90e2';
    }
  };

  return (
    <div className="bg-[#0a0e1a] border-t border-[#1a2332] h-full flex">
      {/* Risk trend chart */}
      <div className="w-1/2 border-r border-[#1a2332] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#4a90e2]" />
          <h3 className="text-xs font-medium text-white/70 tracking-wider uppercase">
            LIVE: Global Supply Chain Risk Monitor
          </h3>
        </div>
        
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={riskData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="riskLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4a90e2" />
                <stop offset="60%" stopColor="#c94444" />
                <stop offset="100%" stopColor="#5a9a7a" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="#3a4a5a"
              tick={{ fill: '#6a7a8a', fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              stroke="#3a4a5a"
              tick={{ fill: '#6a7a8a', fontSize: 10 }}
              tickLine={false}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1621',
                border: '1px solid #1a2332',
                borderRadius: '2px',
                fontSize: '11px',
              }}
              labelStyle={{ color: '#8a9aaa' }}
            />
            <Line
              type="monotone"
              dataKey="risk"
              stroke="url(#riskLine)"
              strokeWidth={2}
              dot={false}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Event log */}
      <div className="w-1/2 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#4a90e2]" />
          <h3 className="text-xs font-medium text-white/70 tracking-wider uppercase">
            System Event Log
          </h3>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a2332] scrollbar-track-transparent pr-2"
        >
          {/* Empty state when no events */}
          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-12 h-12 mb-3 rounded-full bg-[#1a2332] flex items-center justify-center">
                <Info className="w-6 h-6 text-[#4a90e2]/40" />
              </div>
              <p className="text-xs text-white/50 mb-1">No events yet</p>
              <p className="text-[10px] text-white/30">
                System events will appear here as they occur
              </p>
            </div>
          )}
          
          <AnimatePresence>
            {events.map((event) => {
              const Icon = getEventIcon(event.type);
              const color = getEventColor(event.type);
              const isCritical = event.type === 'critical';
              
              return (
                <motion.div
                  key={event.id}
                  className="flex items-start gap-2 text-xs"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="font-mono text-white/40 text-[10px] mt-0.5 shrink-0">
                    {event.time}
                  </span>
                  <Icon
                    className="w-3 h-3 mt-0.5 shrink-0"
                    style={{ color }}
                    strokeWidth={2}
                  />
                  <span
                    className={`leading-relaxed ${
                      isCritical ? 'text-[#c94444] font-medium' : 'text-white/60'
                    }`}
                  >
                    {event.message}
                  </span>
                  
                  {/* Interactive Ship Link if message contains known ship name */}
                  {(() => {
                    const foundShip = MOCK_SHIPS.find(s => event.message.includes(s.name));
                    if (foundShip) {
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onShipClick) onShipClick(foundShip);
                          }}
                          className="ml-auto px-1.5 py-0.5 rounded-xs bg-[#4a90e2]/10 hover:bg-[#4a90e2]/30 border border-[#4a90e2]/30 text-[9px] text-[#4a90e2] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ShipIcon className="w-2.5 h-2.5" />
                          <span>View Ship</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Fade indicator for older events */}
        <div className="h-8 bg-gradient-to-t from-[#0a0e1a] to-transparent pointer-events-none -mt-8 relative z-10" />
      </div>
    </div>
  );
}