import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '../services/websocket';

import { GlobalMap2D } from '../components/GlobalMap2D';
import { GlobalMap3D } from '../components/GlobalMap3D';
import { RouteSelector } from '../components/RouteSelector';
import { CrisisTimeline } from '../components/CrisisTimeline';
import { DemoStartScreen } from '../components/DemoStartScreen';

import { AzureBadges } from '../components/AzureBadges';
import { AgentWorkflow } from '../components/AgentWorkflow';
import { AgentCoTPanel } from '../components/AgentCoTPanel';

import { Route, GlobalPort } from '../utils/routeCalculator';
import { Globe, Map, RefreshCw, Shield, Brain } from 'lucide-react';

import { 
  MarketSentinelResponse, 
  runSimpleAnalysis, 
  runAnalysis,
  createLaneWatchlist 
} from '../services/marketSentinel';

// CoT Type Definitions
interface RAGSource {
  document_id: string;
  title: string;
  section?: string;
  content_snippet?: string;
  relevance_score: number;
  azure_service: string;
}

interface CoTStep {
  step_id: string;
  agent_id: string;
  action: string;
  title: string;
  content: string;
  confidence: number;
  azure_service: string;
  sources?: RAGSource[];
  duration_ms?: number;
}

interface DebateExchange {
  exchange_id: string;
  challenger_agent: string;
  defender_agent: string;
  challenge: string;
  challenge_reason: string;
  response?: string;
  resolution?: string;
  resolution_accepted?: boolean;
  sources?: RAGSource[];
}

interface FinalDecision {
  decision_id: string;
  final_recommendation: string;
  recommendation_details?: {
    route_change?: string;
    additional_days?: number;
    additional_cost?: string;
    risk_reduction?: string;
    savings?: string;
  };
  total_duration_ms?: number;
  approval_options?: Array<{
    id: string;
    label: string;
    action: string;
  }>;
}

// Execution types (NEW)
interface ExecutionStep {
  step_id: string;
  action: string;
  title: string;
  description: string;
  azure_service: string;
  duration_ms: number;
  status?: 'pending' | 'executing' | 'complete';
}

interface ExecutionSummary {
  total_steps: number;
  total_duration_ms: number;
  actions_completed: string[];
  final_status: string;
  risk_score_before: number;
  risk_score_after: number;
  estimated_savings: string;
}

export const DemoPage: React.FC = () => {
  const { connect, events, send } = useWebSocket();

  const [demoStarted, setDemoStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [origin, setOrigin] = useState<GlobalPort | null>(null);
  const [destination, setDestination] = useState<GlobalPort | null>(null);

  const [is3D, setIs3D] = useState(false);
  const [isChangingRoute, setIsChangingRoute] = useState(false);

  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);

  // === Market Sentinel State ===
  const [marketSentinelData, setMarketSentinelData] = useState<MarketSentinelResponse | null>(null);
  const [marketSentinelLoading, setMarketSentinelLoading] = useState(false);
  const [marketSentinelError, setMarketSentinelError] = useState<string | null>(null);

  // === CoT State Management ===
  const [cotSteps, setCotSteps] = useState<CoTStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [debates, setDebates] = useState<DebateExchange[]>([]);
  const [activeDebateIndex, setActiveDebateIndex] = useState(0);
  const [debatePhase, setDebatePhase] = useState<'challenge' | 'response' | 'resolve' | 'complete'>('challenge');
  const [finalDecision, setFinalDecision] = useState<FinalDecision | null>(null);
  const [isCotActive, setIsCotActive] = useState(false);

  // === Execution State (NEW) ===
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [activeExecutionIndex, setActiveExecutionIndex] = useState(-1);
  const [executionPhase, setExecutionPhase] = useState<'pending' | 'executing' | 'complete'>('pending');
  const [executionSummary, setExecutionSummary] = useState<ExecutionSummary | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  // === Resizable Right Sidebar ===
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const isResizing = useRef(false);
  const minWidth = 320;
  const maxWidth = 600;

  // === Resizable Bottom Panel ===
  const [bottomHeight, setBottomHeight] = useState(220);
  const isResizingBottom = useRef(false);
  const minBottomHeight = 120;
  const maxBottomHeight = 400;
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleBottomMouseDown = useCallback(() => {
    isResizingBottom.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    }
    if (isResizingBottom.current && mapContainerRef.current) {
      const containerRect = mapContainerRef.current.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      setBottomHeight(Math.min(maxBottomHeight, Math.max(minBottomHeight, newHeight)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    isResizingBottom.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Clock only runs while demo is started
  useEffect(() => {
    if (!demoStarted) return;
    const interval = setInterval(() => setCurrentTime((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [demoStarted]);

  // === WebSocket Event Handlers ===
  useEffect(() => {
    if (events.length === 0) return;
    
    const latestEvent = events[events.length - 1];
    console.log('[CoT Event]', latestEvent.type, latestEvent);

    switch (latestEvent.type) {
      case 'COT_START':
        setIsCotActive(true);
        setCotSteps([]);
        setActiveStepIndex(-1);
        break;

      case 'COT_STEP':
        const stepData = latestEvent.data as CoTStep;
        setCotSteps(prev => [...prev, stepData]);
        setActiveStepIndex(latestEvent.step_index);
        break;

      case 'RAG_CITATION':
        // RAG citation is included in COT_STEP, this can be used for additional highlighting
        break;

      case 'DEBATE_START':
        setDebates([]);
        setActiveDebateIndex(0);
        setDebatePhase('challenge');
        break;

      case 'DEBATE_CHALLENGE':
        const challengeData = latestEvent.data;
        setDebates(prev => {
          const existing = [...prev];
          if (!existing[latestEvent.exchange_index]) {
            existing[latestEvent.exchange_index] = {
              exchange_id: challengeData.exchange_id,
              challenger_agent: challengeData.challenger,
              defender_agent: challengeData.defender,
              challenge: challengeData.challenge,
              challenge_reason: challengeData.reason,
            };
          }
          return existing;
        });
        setActiveDebateIndex(latestEvent.exchange_index);
        setDebatePhase('challenge');
        break;

      case 'DEBATE_RESPONSE':
        const responseData = latestEvent.data;
        setDebates(prev => {
          const updated = [...prev];
          if (updated[latestEvent.exchange_index]) {
            updated[latestEvent.exchange_index] = {
              ...updated[latestEvent.exchange_index],
              response: responseData.response,
            };
          }
          return updated;
        });
        setDebatePhase('response');
        break;

      case 'DEBATE_RESOLVE':
        const resolveData = latestEvent.data;
        setDebates(prev => {
          const updated = [...prev];
          if (updated[latestEvent.exchange_index]) {
            updated[latestEvent.exchange_index] = {
              ...updated[latestEvent.exchange_index],
              resolution: resolveData.resolution,
              resolution_accepted: resolveData.accepted,
              sources: resolveData.sources,
            };
          }
          return updated;
        });
        setDebatePhase('resolve');
        break;

      case 'DECISION_READY':
        const decisionData = latestEvent.data;
        setFinalDecision({
          decision_id: decisionData.decision_id,
          final_recommendation: decisionData.final_recommendation,
          recommendation_details: decisionData.recommendation_details,
          total_duration_ms: decisionData.total_duration_ms,
          approval_options: decisionData.approval_options,
        });
        setIsCotActive(false);
        break;

      // === Execution Events (NEW) ===
      case 'AWAITING_CONFIRMATION':
        setAwaitingConfirmation(true);
        break;

      case 'CONFIRMATION_RECEIVED':
        setAwaitingConfirmation(false);
        break;

      case 'EXECUTION_START':
        setExecutionPhase('executing');
        setExecutionSteps([]);
        setActiveExecutionIndex(-1);
        break;

      case 'EXECUTION_STEP':
        const execStepData = latestEvent.data as ExecutionStep;
        setExecutionSteps(prev => {
          const existing = [...prev];
          if (!existing.find(s => s.step_id === execStepData.step_id)) {
            existing.push({ ...execStepData, status: 'executing' });
          }
          return existing;
        });
        setActiveExecutionIndex(latestEvent.step_index);
        break;

      case 'EXECUTION_STEP_COMPLETE':
        setExecutionSteps(prev => {
          return prev.map((step, idx) => 
            idx === latestEvent.step_index 
              ? { ...step, status: 'complete' as const }
              : step
          );
        });
        break;

      case 'EXECUTION_COMPLETE':
        setExecutionPhase('complete');
        setExecutionSummary(latestEvent.data as ExecutionSummary);
        setActiveExecutionIndex(-1);
        break;

      case 'DEMO_COMPLETE':
        setIsCotActive(false);
        break;
    }
  }, [events]);

  const scenarioPhase = useMemo(() => {
    const t = currentTime % 60;
    if (t < 5) return 'Monitoring pre-incident';
    if (t < 15) return 'Detection & validation';
    if (t < 25) return 'Threat confirmation';
    if (t < 35) return 'Response orchestration';
    if (t < 45) return 'Reroute & mitigation';
    return 'Stabilization & review';
  }, [currentTime]);

  const startBackendDemo = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v2/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'crisis_455pm' }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.websocket_url) connect(data.websocket_url);
      } else {
        console.warn('Backend not ready, running in UI-only mode');
      }
    } catch (e) {
      console.warn('Backend unreachable, running in UI-only mode', e);
    }
  };

  const handleStartDemo = async (originPort: GlobalPort, destinationPort: GlobalPort) => {
    setOrigin(originPort);
    setDestination(destinationPort);

    setDemoStarted(true);
    setIsChangingRoute(false);

    setRoutes([]);
    setSelectedRoute(null);

    // Reset CoT state
    setCotSteps([]);
    setActiveStepIndex(-1);
    setDebates([]);
    setActiveDebateIndex(0);
    setDebatePhase('challenge');
    setFinalDecision(null);
    setIsCotActive(false);

    // Reset Execution state (NEW)
    setExecutionSteps([]);
    setActiveExecutionIndex(-1);
    setExecutionPhase('pending');
    setExecutionSummary(null);
    setAwaitingConfirmation(false);

    setCurrentTime(0);

    await startBackendDemo();
  };

  // Handle user confirmation of decision (NEW)
  const handleConfirmDecision = async (action: string) => {
    console.log('[Decision Confirmation] User clicked:', action);
    // 通过WebSocket发送确认消息给后端
    // 后端会等待这个确认才继续执行
    const message = {
      action: "confirm",
      confirmation_type: action
    };
    console.log('[Decision Confirmation] Sending message:', message);
    send(message);
    console.log('[Decision Confirmation] Message sent');
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
  };

  // Run Market Sentinel analysis
  const runMarketSentinel = useCallback(async () => {
    setMarketSentinelLoading(true);
    setMarketSentinelError(null);
    
    try {
      let response: MarketSentinelResponse;
      
      // If we have origin/destination, run with lane watchlist
      if (origin && destination) {
        // Extract port codes from names (e.g., "Shanghai" -> "CNSHA")
        const originCode = getPortCode(origin.name);
        const destinationCode = getPortCode(destination.name);
        
        if (originCode && destinationCode) {
          const params = createLaneWatchlist(originCode, destinationCode);
          response = await runAnalysis(params);
        } else {
          response = await runSimpleAnalysis();
        }
      } else {
        response = await runSimpleAnalysis();
      }
      
      setMarketSentinelData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setMarketSentinelError(errorMessage);
      console.error('Market Sentinel error:', err);
    } finally {
      setMarketSentinelLoading(false);
    }
  }, [origin, destination]);

  // Helper to convert port names to codes
  const getPortCode = (portName: string): string | null => {
    const portCodes: Record<string, string> = {
      'Shanghai': 'CNSHA',
      'Singapore': 'SGSIN',
      'Rotterdam': 'NLRTM',
      'Los Angeles': 'USLAX',
      'Long Beach': 'USLGB',
      'Hong Kong': 'HKHKG',
      'Shenzhen': 'CNSZX',
      'Busan': 'KRPUS',
      'Hamburg': 'DEHAM',
      'Antwerp': 'BEANR',
      'Dubai': 'AEJEA',
      'Mumbai': 'INBOM',
      'Tokyo': 'JPTYO',
      'New York': 'USNYC',
      'Felixstowe': 'GBFXT',
      'Colombo': 'LKCMB',
      'Tanjung Pelepas': 'MYTPP',
      'Port Klang': 'MYPKG',
    };
    return portCodes[portName] || null;
  };

  if (!demoStarted) {
    return <DemoStartScreen onStart={handleStartDemo} />;
  }

  return (
    <div className="demo-page h-screen max-h-screen bg-[#0a0e1a] text-white overflow-hidden flex flex-col">
      {/* Page-scoped typography reset to avoid global base button/label styles affecting alignment */}
      <style>{`
        .demo-page button { font-size: 0.75rem; line-height: 1rem; }
        .demo-page label  { font-size: 0.75rem; line-height: 1rem; }
      `}</style>

      {/* Route Change Modal */}
      {isChangingRoute && (
        <DemoStartScreen
          onStart={handleStartDemo}
          currentOrigin={origin}
          currentDestination={destination}
          isChanging={true}
          onCancel={() => setIsChangingRoute(false)}
        />
      )}

      {/* Header */}
      <header className="h-14 bg-[#0f1621] border-b border-[#1a2332] px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-[#0078d4] to-[#4a90e2] rounded-sm flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" strokeWidth={2} />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-wide truncate">
              Globot Shield · 4:55 PM Strait of Hormuz scenario
            </h1>
            <p className="text-xs text-white/40 truncate">
              {origin?.name} → {destination?.name} · T+{currentTime}s · {scenarioPhase}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* CoT Active Indicator */}
          {isCotActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#4a90e2]/20 border border-[#4a90e2]/30 rounded-sm animate-pulse">
              <Brain className="w-3.5 h-3.5 text-[#4a90e2]" />
              <span className="text-xs text-[#4a90e2] font-medium">CoT Active</span>
            </div>
          )}

          {/* Change Route Button */}
          <button
            onClick={() => setIsChangingRoute(true)}
            className="px-3 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-2 bg-[#0a0e1a] border border-[#1a2332] text-white/60 hover:text-white/90 hover:border-[#4a90e2]/50"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
            Change Route
          </button>

          {/* 2D/3D Toggle */}
          <div className="flex items-center gap-1 bg-[#0a0e1a] border border-[#1a2332] rounded-sm p-1">
            <button
              onClick={() => setIs3D(false)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-2 ${
                !is3D
                  ? 'bg-[#4a90e2]/20 text-[#4a90e2] border border-[#4a90e2]/30'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Map className="w-3.5 h-3.5" strokeWidth={2} />
              2D
            </button>
            <button
              onClick={() => setIs3D(true)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-2 ${
                is3D
                  ? 'bg-[#4a90e2]/20 text-[#4a90e2] border border-[#4a90e2]/30'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5" strokeWidth={2} />
              3D
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#5a9a7a]/20 border border-[#5a9a7a]/30 rounded-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5a9a7a] animate-pulse" />
            <span className="text-xs text-[#5a9a7a] font-medium">System Running</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Map section */}
        <div ref={mapContainerRef} className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
          <div className="flex-1 relative min-h-0 overflow-hidden">
            {/* Route Selector */}
            {routes.length > 0 && (
              <RouteSelector routes={routes} selectedRoute={selectedRoute} onRouteSelect={handleRouteSelect} />
            )}

            {is3D ? (
              <GlobalMap3D
                origin={origin || undefined}
                destination={destination || undefined}
                onRouteSelect={handleRouteSelect}
                onRoutesCalculated={setRoutes}
                selectedRouteFromParent={selectedRoute}
              />
            ) : (
              <GlobalMap2D
                origin={origin || undefined}
                destination={destination || undefined}
                onRouteSelect={handleRouteSelect}
                onRoutesCalculated={setRoutes}
                selectedRouteFromParent={selectedRoute}
              />
            )}
          </div>

          {/* Resize Handle for Bottom Panel */}
          <div
            className="h-1 cursor-row-resize hover:bg-[#4a90e2] transition-colors z-10 group flex items-center justify-center"
            onMouseDown={handleBottomMouseDown}
          >
            <div className="w-16 h-1 bg-[#1a2332] group-hover:bg-[#4a90e2] rounded-full transition-colors" />
          </div>

          {/* Timeline */}
          <div className="shrink-0" style={{ height: bottomHeight }}>
            <CrisisTimeline />
          </div>
        </div>

        {/* Resizable Right Sidebar */}
        <div 
          className="bg-[#0a0e1a] border-l border-[#1a2332] flex flex-col overflow-hidden relative"
          style={{ width: sidebarWidth }}
        >
          {/* Resize Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#4a90e2] transition-colors z-10 group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-[#1a2332] group-hover:bg-[#4a90e2] rounded-full transition-colors" />
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 pl-2">
            {/* Azure stack badges */}
            <AzureBadges />

            {/* Chain-of-Thought Panel */}
            <AgentCoTPanel
              steps={cotSteps}
              debates={debates}
              decision={finalDecision}
              activeStepIndex={activeStepIndex}
              activeDebateIndex={activeDebateIndex}
              debatePhase={debatePhase}
              isActive={isCotActive}
              executionSteps={executionSteps}
              activeExecutionIndex={activeExecutionIndex}
              executionPhase={executionPhase}
              executionSummary={executionSummary}
              awaitingConfirmation={awaitingConfirmation}
              onConfirmDecision={handleConfirmDecision}
            />

            {/* Agent workflow */}
            <AgentWorkflow 
              currentTime={currentTime} 
              isLive={demoStarted}
              marketSentinelData={marketSentinelData}
              marketSentinelLoading={marketSentinelLoading}
              marketSentinelError={marketSentinelError}
              onRunMarketSentinel={runMarketSentinel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

