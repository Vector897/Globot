import React, { useEffect, useMemo, useState } from 'react';
import { useWebSocket } from '../services/websocket';

import { GlobalMap2D } from '../components/GlobalMap2D';
import { GlobalMap3D } from '../components/GlobalMap3D';
import { RouteSelector } from '../components/RouteSelector';
import { CrisisTimeline } from '../components/CrisisTimeline';
import { DemoStartScreen } from '../components/DemoStartScreen';

import { AzureBadges } from '../components/AzureBadges';
import { AgentWorkflow } from '../components/AgentWorkflow';

import { Route, GlobalPort } from '../utils/routeCalculator';
import { Globe, Map, RefreshCw, Shield } from 'lucide-react';

export const DemoPage: React.FC = () => {
  const { connect } = useWebSocket();

  const [demoStarted, setDemoStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [origin, setOrigin] = useState<GlobalPort | null>(null);
  const [destination, setDestination] = useState<GlobalPort | null>(null);

  const [is3D, setIs3D] = useState(false);
  const [isChangingRoute, setIsChangingRoute] = useState(false);

  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);

  // Clock only runs while demo is started
  useEffect(() => {
    if (!demoStarted) return;
    const interval = setInterval(() => setCurrentTime((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [demoStarted]);

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

    setCurrentTime(0);

    await startBackendDemo();
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
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
        <div className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
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

          {/* Timeline */}
          <div className="h-[220px] shrink-0">
            <CrisisTimeline />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-[380px] bg-[#0a0e1a] border-l border-[#1a2332] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2">
            {/* Azure stack badges */}
            <AzureBadges />

            {/* Agent workflow */}
            <AgentWorkflow currentTime={currentTime} isLive={demoStarted} />
          </div>
        </div>
      </div>
    </div>
  );
};
