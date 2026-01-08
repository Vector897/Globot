import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import React from 'react';

interface TimelineEvent {
  id: string;
  time: string;
  message: string;
  type: 'critical' | 'info' | 'success';
}

const eventMessages = [
  { message: 'Risk Hedger recalculated exposure across 47 active shipments', type: 'success' as const },
  { message: 'Alternative route via Southern corridor approved by Logistics Orchestrator', type: 'success' as const },
  { message: 'Adversarial Debate validated route feasibility against historical data', type: 'info' as const },
  { message: 'Azure OpenAI queried 1,247 regulatory documents for compliance check', type: 'info' as const },
  { message: 'Market Sentinel detected geopolitical risk spike in North Atlantic corridor', type: 'critical' as const },
  { message: 'Azure AI Search indexed 3,421 new shipping reports', type: 'info' as const },
  { message: 'Compliance Manager flagged new sanctions on Hamburg route', type: 'critical' as const },
  { message: 'Port congestion alert - Hamburg capacity at 94%', type: 'critical' as const },
  { message: 'Logistics Orchestrator secured alternative carrier capacity', type: 'success' as const },
  { message: 'Azure Cognitive identified 3 historical precedents for crisis events', type: 'info' as const },
];

export function CrisisTimeline() {
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
  const [eventIndex, setEventIndex] = useState(0);
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

  // Continuous event log updates
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const newEvent: TimelineEvent = {
        id: Date.now().toString(),
        time,
        ...eventMessages[eventIndex % eventMessages.length],
      };

      setEvents((prev) => [newEvent, ...prev].slice(0, 8));
      setEventIndex((prev) => prev + 1);
    }, 3500); // New event every 3.5 seconds

    return () => clearInterval(interval);
  }, [eventIndex]);

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