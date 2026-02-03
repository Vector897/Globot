import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Route } from '../utils/routeCalculator';
import { Check, Clock, TrendingUp, MapPin, Navigation, ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

// Helper function for risk level icons (colorblind accessibility)
const getRiskIcon = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high':
      return <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />;
    case 'medium':
      return <AlertCircle className="w-3 h-3" strokeWidth={2.5} />;
    case 'low':
      return <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />;
    default:
      return null;
  }
};

interface RouteSelectorProps {
  routes: Route[];
  selectedRoute: Route | null;
  onRouteSelect: (route: Route) => void;
  isLoading?: boolean;
}

// Skeleton loader for route cards
const RouteCardSkeleton = () => (
  <div className="w-full p-3 rounded-sm border border-[#1a2332] bg-[#0a0e1a] animate-pulse">
    <div className="flex items-start justify-between gap-2 mb-2.5">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#1a2332]" />
        <div>
          <div className="h-3 w-32 bg-[#1a2332] rounded mb-1" />
          <div className="h-2 w-24 bg-[#1a2332]/60 rounded" />
        </div>
      </div>
    </div>
    <div className="mb-2.5 pb-2.5 border-b border-white/5">
      <div className="h-2 w-16 bg-[#1a2332]/60 rounded mb-2" />
      <div className="space-y-2">
        <div className="h-2 w-20 bg-[#1a2332]/40 rounded" />
        <div className="h-2 w-28 bg-[#1a2332]/40 rounded" />
        <div className="h-2 w-24 bg-[#1a2332]/40 rounded" />
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="h-3 w-16 bg-[#1a2332]/60 rounded" />
      <div className="h-3 w-12 bg-[#1a2332]/60 rounded" />
      <div className="ml-auto h-5 w-16 bg-[#1a2332] rounded" />
    </div>
  </div>
);

export function RouteSelector({ routes, selectedRoute, onRouteSelect, isLoading = false }: RouteSelectorProps) {
  const [width, setWidth] = React.useState(360);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const isResizing = React.useRef(false);

  // Resize Handlers
  const handleMouseDown = React.useCallback(() => {
    if (isCollapsed) return;
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isCollapsed]);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX - 24; // 24px is left-6 offset (1.5rem)
    setWidth(Math.min(600, Math.max(280, newWidth)));
  }, []);

  const handleMouseUp = React.useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Empty state component
  if (routes.length === 0 && !isLoading) {
    return (
      <motion.div
        className="absolute top-20 left-6 bg-[#0f1621]/98 border border-[#1a2332] rounded-r-sm z-20 p-6 w-80"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div className="flex flex-col items-center text-center">
          {/* Empty state illustration */}
          <div className="w-16 h-16 mb-4 rounded-full bg-[#1a2332] flex items-center justify-center">
            <Navigation className="w-8 h-8 text-[#4a90e2]/50" />
          </div>
          
          <h3 className="text-sm font-semibold text-white/80 mb-2">
            No Routes Available
          </h3>
          
          <p className="text-xs text-white/50 mb-4 leading-relaxed">
            Select an origin and destination port to calculate optimal shipping routes, or activate a crisis scenario to see rerouting options.
          </p>
          
          {/* Action hints */}
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4a90e2]" />
              <span>Click on ports to select origin/destination</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c94444]" />
              <span>Enable crisis scenarios to see alternate routes</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show all 4 routes
  const displayRoutes = routes.slice(0, 4);

  return (
    <motion.div
      className="absolute top-20 left-6 bg-[#0f1621]/98 border border-[#1a2332] rounded-r-sm flex flex-col z-20"
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: 1, 
        x: 0,
        width: isCollapsed ? 24 : width
      }}
      transition={{ duration: 0.3 }}
      style={{ 
        backdropFilter: 'blur(8px)',
        maxHeight: 'calc(100vh - 120px)'
      }}
    >
      <style>{`
        .route-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .route-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .route-scroll::-webkit-scrollbar-thumb {
          background: #1a2332;
          border-radius: 3px;
        }
        .route-scroll::-webkit-scrollbar-thumb:hover {
          background: #4a90e2;
        }
      `}</style>

      {/* Toggle Button with Tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-5 top-2 w-6 h-10 bg-[#0f1621] border border-l-0 border-[#1a2332] rounded-r-sm flex items-center justify-center text-white/40 hover:text-white hover:bg-[#1a2332] transition-colors z-30 focus:outline-none focus:ring-2 focus:ring-[#4a90e2]/50"
            aria-label={isCollapsed ? "Expand route panel" : "Collapse route panel"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-[#1a2332] text-white border-[#2a3342]">
          {isCollapsed ? "Show routes" : "Hide routes"}
        </TooltipContent>
      </Tooltip>

      {/* Resize Handle - only active when not collapsed */}
      {!isCollapsed && (
        <div 
          className="absolute top-0 bottom-0 -right-1 w-2 cursor-col-resize hover:bg-[#4a90e2]/50 transition-colors z-20 rounded-r-sm"
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Content Container - Hide when collapsed */}
      <div className={`flex flex-col min-h-0 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ width: '100%' }}>
        {!isCollapsed && (
          <div className="p-4 flex flex-col min-h-0 w-full">
            {/* Header */}
            <div className="mb-3 pb-2 border-b border-[#1a2332] shrink-0">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Available Routes
              </h3>
              <p className="text-[10px] text-white/40 mt-1">
                {displayRoutes.length} AI-analyzed shipping corridors
              </p>
            </div>

            {/* Route Options */}
            <div className="space-y-2.5 overflow-y-auto route-scroll pr-1" style={{ maxHeight: '320px' }}>
              {/* Loading skeleton state */}
              {isLoading && (
                <>
                  <RouteCardSkeleton />
                  <RouteCardSkeleton />
                  <RouteCardSkeleton />
                </>
              )}
              
              {/* Actual route cards */}
              {!isLoading && displayRoutes.map((route, index) => {
                const isSelected = selectedRoute?.id === route.id;
                
                return (
                  <motion.button
                    key={route.id}
                    onClick={() => onRouteSelect(route)}
                    className={`w-full text-left p-3 rounded-sm border transition-all ${
                      isSelected
                        ? 'bg-[#4a90e2]/10 border-[#4a90e2] ring-1 ring-[#4a90e2]/50'
                        : 'bg-[#0a0e1a] border-[#1a2332] hover:border-[#4a90e2]/50'
                    }`}
                    whileHover={{ scale: isSelected ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        {/* Risk indicator */}
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                          style={{
                            backgroundColor: route.color,
                            boxShadow: `0 0 8px ${route.color}80`,
                          }}
                        />
                        <div>
                          <div className="text-xs font-medium text-white/90">
                            {route.name}
                          </div>
                          <div className="text-[10px] text-white/40 mt-0.5">
                            {route.description}
                          </div>
                        </div>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="flex-shrink-0 w-4 h-4 bg-[#4a90e2] rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Waypoints - Visual Flow */}
                    <div className="mb-2.5 pb-2.5 border-b border-white/5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Navigation className="w-3 h-3 text-white/40" strokeWidth={2} />
                        <span className="text-[9px] text-white/40 font-medium uppercase tracking-wider">
                          Route Path
                        </span>
                      </div>
                      <div className="space-y-1">
                        {route.waypointNames.map((waypoint, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            {/* Port icon and connector */}
                            <div className="flex flex-col items-center">
                              <MapPin 
                                className="w-2.5 h-2.5 flex-shrink-0" 
                                style={{ 
                                  color: idx === 0 ? '#4a90e2' : idx === route.waypointNames.length - 1 ? '#c94444' : route.color 
                                }}
                                strokeWidth={2.5}
                              />
                              {idx < route.waypointNames.length - 1 && (
                                <div 
                                  className="w-[1px] h-2 my-0.5"
                                  style={{ backgroundColor: `${route.color}40` }}
                                />
                              )}
                            </div>
                            {/* Port name */}
                            <span 
                              className={`text-[10px] leading-tight ${
                                idx === 0 || idx === route.waypointNames.length - 1 
                                  ? 'text-white/70 font-medium' 
                                  : 'text-white/50'
                              }`}
                            >
                              {waypoint}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Route Stats */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-white/40" strokeWidth={2} />
                        <span className="text-[10px] text-white/60">
                          {route.distance.toFixed(0)} km
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-white/40" strokeWidth={2} />
                        <span className="text-[10px] text-white/60">
                          ~{route.estimatedTime}h
                        </span>
                      </div>
                      <div
                        className={`ml-auto flex items-center gap-1 px-2 py-1 rounded-sm text-[9px] font-medium uppercase tracking-wider ${
                          route.riskLevel === 'high'
                            ? 'bg-[#c94444]/20 text-[#c94444]'
                            : route.riskLevel === 'medium'
                            ? 'bg-[#e8a547]/20 text-[#e8a547]'
                            : 'bg-[#5a9a7a]/20 text-[#5a9a7a]'
                        }`}
                        role="status"
                        aria-label={`Risk level: ${route.riskLevel}`}
                      >
                        {getRiskIcon(route.riskLevel)}
                        <span>{route.riskLevel}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Auto-select note */}
            <div className="mt-3 pt-2 border-t border-[#1a2332] text-[10px] text-white/30 shrink-0">
              AI automatically selects optimal route based on risk assessment
            </div>
          </div>
        )}
      </div>

      {/* Collapsed State Indicator (Vertical Text) */}
      {isCollapsed && (
        <div className="h-full flex flex-col items-center py-4 gap-4">
          <Navigation className="w-4 h-4 text-white/60" />
          <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium text-white/60 tracking-wider">
            ROUTES
          </div>
        </div>
      )}
    </motion.div>
  );
}