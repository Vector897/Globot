import { motion } from 'motion/react';
import { Route } from '../utils/routeCalculator';
import { Check, Clock, TrendingUp, MapPin, Navigation } from 'lucide-react';

interface RouteSelectorProps {
  routes: Route[];
  selectedRoute: Route | null;
  onRouteSelect: (route: Route) => void;
}

export function RouteSelector({ routes, selectedRoute, onRouteSelect }: RouteSelectorProps) {
  if (routes.length === 0) return null;

  // Show all 4 routes
  const displayRoutes = routes.slice(0, 4);

  return (
    <motion.div
      className="absolute top-20 left-6 bg-[#0f1621]/98 border border-[#1a2332] rounded-sm p-4 max-w-[360px] z-20"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-[#1a2332]">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
          Available Routes
        </h3>
        <p className="text-[10px] text-white/40 mt-1">
          {displayRoutes.length} AI-analyzed shipping corridors
        </p>
      </div>

      {/* Route Options */}
      <div className="space-y-2.5 max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a2332] scrollbar-track-transparent pr-1">
        {displayRoutes.map((route, index) => {
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
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
                  <motion.div
                    className="flex-shrink-0 w-4 h-4 bg-[#4a90e2] rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </motion.div>
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
                  className={`ml-auto px-2 py-0.5 rounded-sm text-[9px] font-medium uppercase tracking-wider ${
                    route.riskLevel === 'high'
                      ? 'bg-[#c94444]/20 text-[#c94444]'
                      : route.riskLevel === 'medium'
                      ? 'bg-[#e8a547]/20 text-[#e8a547]'
                      : 'bg-[#5a9a7a]/20 text-[#5a9a7a]'
                  }`}
                >
                  {route.riskLevel} risk
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Auto-select note */}
      <div className="mt-3 pt-2 border-t border-[#1a2332] text-[10px] text-white/30">
        AI automatically selects optimal route based on risk assessment
      </div>
    </motion.div>
  );
}