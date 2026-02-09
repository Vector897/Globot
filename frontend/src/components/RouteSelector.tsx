import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Route } from '../utils/routeCalculator';
import {
  Check,
  Clock,
  TrendingUp,
  Navigation,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Anchor,
  MapPin,
} from 'lucide-react';
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

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high': return '#c94444';
    case 'medium': return '#e8a547';
    case 'low': return '#5a9a7a';
    default: return '#4a90e2';
  }
};

interface RouteSelectorProps {
  routes: Route[];
  selectedRoute: Route | null;
  onRouteSelect: (route: Route) => void;
  isLoading?: boolean;
}

export function RouteSelector({ routes, selectedRoute, onRouteSelect, isLoading = false }: RouteSelectorProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Empty state
  if (routes.length === 0 && !isLoading) {
    return (
      <div
        className="absolute top-4 left-4 z-20 bg-[#0a0e1a]/95 border border-[#1a2332] rounded-sm overflow-hidden"
        style={{ backdropFilter: 'blur(12px)', width: 320 }}
      >
        <div className="px-4 py-3 border-b border-[#1a2332] bg-gradient-to-r from-[#1a2332]/50 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#4a90e2]" />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Route Analysis
            </span>
          </div>
        </div>
        <div className="p-6 text-center">
          <Navigation className="w-8 h-8 text-white/15 mx-auto mb-3" />
          <p className="text-xs text-white/50 mb-1 font-medium">No Routes Available</p>
          <p className="text-[10px] text-white/30 leading-relaxed">
            Select origin and destination ports to calculate shipping corridors.
          </p>
        </div>
      </div>
    );
  }

  const displayRoutes = routes.slice(0, 4);

  return (
    <motion.div
      className="absolute top-4 left-4 z-20 bg-[#0a0e1a]/95 border border-[#1a2332] rounded-sm overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: 1,
        x: 0,
        width: isCollapsed ? 28 : 340,
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ backdropFilter: 'blur(12px)', maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Toggle Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-0 top-0 bottom-0 w-6 bg-transparent hover:bg-[#1a2332]/80 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors z-30 focus:outline-none"
            aria-label={isCollapsed ? 'Expand route panel' : 'Collapse route panel'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-[#1a2332] text-white border-[#2a3342]">
          {isCollapsed ? 'Show routes' : 'Hide routes'}
        </TooltipContent>
      </Tooltip>

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="h-full flex flex-col items-center py-4 gap-3">
          <Anchor className="w-3.5 h-3.5 text-white/40" />
          <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold text-white/40 tracking-widest uppercase">
            Routes
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex flex-col transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none h-0' : 'opacity-100'}`}>
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-[#1a2332] bg-gradient-to-r from-[#1a2332]/50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4a90e2]" />
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Route Analysis
              </span>
            </div>
            <span className="text-[10px] text-white/30 font-mono">
              {displayRoutes.length} corridors
            </span>
          </div>
        </div>

        {/* Route List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Loading skeleton */}
          {isLoading && (
            <div className="p-3 space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="p-3 border border-[#1a2332] rounded-sm animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#1a2332]" />
                    <div className="h-3 w-24 bg-[#1a2332] rounded" />
                    <div className="ml-auto h-3 w-12 bg-[#1a2332] rounded" />
                  </div>
                  <div className="flex gap-4">
                    <div className="h-2.5 w-16 bg-[#1a2332]/60 rounded" />
                    <div className="h-2.5 w-12 bg-[#1a2332]/60 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Route Cards */}
          {!isLoading && (
            <div className="p-2 space-y-1">
              {displayRoutes.map((route) => {
                const isSelected = selectedRoute?.id === route.id;
                const riskColor = getRiskColor(route.riskLevel);

                return (
                  <motion.button
                    key={route.id}
                    onClick={() => onRouteSelect(route)}
                    className={`w-full text-left rounded-sm transition-all group ${
                      isSelected
                        ? 'bg-[#4a90e2]/8 border border-[#4a90e2]/40'
                        : 'bg-transparent border border-transparent hover:bg-[#1a2332]/50 hover:border-[#1a2332]'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Main Row */}
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5 mb-2">
                        {/* Route color indicator */}
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: route.color,
                              boxShadow: isSelected ? `0 0 8px ${route.color}60` : 'none',
                            }}
                          />
                          {isSelected && (
                            <motion.div
                              className="absolute -inset-1 rounded-full border"
                              style={{ borderColor: `${route.color}40` }}
                              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.2, 0.6] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </div>

                        {/* Route name */}
                        <span className={`text-xs font-medium flex-1 ${isSelected ? 'text-white' : 'text-white/70'}`}>
                          {route.name}
                        </span>

                        {/* Selection check */}
                        {isSelected && (
                          <div className="w-4 h-4 bg-[#4a90e2] rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 ml-5">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-white/30" strokeWidth={2} />
                          <span className="text-[10px] text-white/50 font-mono">
                            {route.distance.toLocaleString()} nm
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-white/30" strokeWidth={2} />
                          <span className="text-[10px] text-white/50 font-mono">
                            ~{route.estimatedTime}d
                          </span>
                        </div>

                        {/* Risk badge */}
                        <div
                          className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${riskColor}15`,
                            color: riskColor,
                          }}
                          role="status"
                          aria-label={`Risk level: ${route.riskLevel}`}
                        >
                          {getRiskIcon(route.riskLevel)}
                          <span>{route.riskLevel}</span>
                        </div>
                      </div>

                      {/* Waypoints (compact, only shown when selected) */}
                      <AnimatePresence>
                        {isSelected && route.waypointNames.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 pt-2 border-t border-white/5 ml-5">
                              <div className="flex items-center gap-1 flex-wrap">
                                {route.waypointNames.map((wp, idx) => (
                                  <React.Fragment key={idx}>
                                    <span
                                      className={`text-[9px] ${
                                        idx === 0
                                          ? 'text-[#4a90e2] font-medium'
                                          : idx === route.waypointNames.length - 1
                                          ? 'text-[#c94444] font-medium'
                                          : 'text-white/40'
                                      }`}
                                    >
                                      {wp}
                                    </span>
                                    {idx < route.waypointNames.length - 1 && (
                                      <ChevronRight className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1a2332] bg-[#0a0e1a]">
          <span className="text-[9px] text-white/25 leading-tight">
            AI-optimized corridors · Risk assessed via real-time data
          </span>
        </div>
      </div>
    </motion.div>
  );
}
