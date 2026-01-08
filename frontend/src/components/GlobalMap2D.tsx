import React from 'react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { RouteLegend } from './RouteLegend';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { calculateRoutes, Route } from '../utils/routeCalculator';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Port {
  name: string;
  coordinates: [number, number];
}

interface GlobalMap2DProps {
  origin?: Port;
  destination?: Port;
  onRouteSelect?: (route: Route) => void;
  onRoutesCalculated?: (routes: Route[]) => void;
  selectedRouteFromParent?: Route | null;
}

export function GlobalMap2D({ origin, destination, onRouteSelect, onRoutesCalculated, selectedRouteFromParent }: GlobalMap2DProps) {
  const [pulseOpacity, setPulseOpacity] = useState(0.6);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseOpacity((prev) => (prev === 0.6 ? 1 : 0.6));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Calculate routes when origin and destination change
  useEffect(() => {
    if (origin && destination) {
      const calculatedRoutes = calculateRoutes(
        origin.coordinates,
        destination.coordinates
      );
      setRoutes(calculatedRoutes);
      
      // Auto-select the best (safest) route
      const bestRoute = calculatedRoutes.find((r) => r.riskLevel === 'low') || calculatedRoutes[0];
      setSelectedRoute(bestRoute);
      
      // Notify parent of all routes
      if (onRoutesCalculated) {
        onRoutesCalculated(calculatedRoutes);
      }
      
      // Notify parent of selected route
      if (onRouteSelect) {
        onRouteSelect(bestRoute);
      }

      // Auto-center on route
      const midLng = (origin.coordinates[0] + destination.coordinates[0]) / 2;
      const midLat = (origin.coordinates[1] + destination.coordinates[1]) / 2;
      setCenter([midLng, midLat]);
      setZoom(1.5);
    } else {
      setRoutes([]);
      setSelectedRoute(null);
    }
  }, [origin, destination]);

  // Update local selected route when parent changes it
  useEffect(() => {
    if (selectedRouteFromParent) {
      setSelectedRoute(selectedRouteFromParent);
    }
  }, [selectedRouteFromParent]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.5, 8));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.5, 1));
  };

  const handleReset = () => {
    setZoom(1);
    setCenter([0, 20]);
  };

  const handleRouteClick = (route: Route) => {
    setSelectedRoute(route);
    if (onRouteSelect) {
      onRouteSelect(route);
    }
  };

  // Helper function to draw a curved line through waypoints
  const renderRouteLine = (route: Route, isSelected: boolean) => {
    const opacity = isSelected ? pulseOpacity : 0.3;
    const strokeWidth = isSelected ? route.strokeWidth : route.strokeWidth * 0.6;

    return (
      <g key={route.id}>
        {route.waypoints.map((waypoint, index) => {
          if (index === route.waypoints.length - 1) return null;
          const nextWaypoint = route.waypoints[index + 1];
          
          return (
            <Line
              key={`${route.id}-segment-${index}`}
              from={waypoint}
              to={nextWaypoint}
              stroke={route.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={opacity}
              style={{
                filter: isSelected ? `drop-shadow(0 0 8px ${route.color})` : 'none',
                cursor: 'pointer',
              }}
              onClick={() => handleRouteClick(route)}
            />
          );
        })}
      </g>
    );
  };

  return (
    <div className="relative w-full h-full bg-[#0a0e1a] overflow-hidden">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid-2d" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a90e2" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-2d)" />
        </svg>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
        <motion.button
          onClick={handleZoomIn}
          className="p-2 bg-[#0f1621]/95 border border-[#1a2332] rounded-sm text-white/60 hover:text-white/90 hover:border-[#4a90e2]/50 backdrop-blur-sm transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ZoomIn className="w-4 h-4" strokeWidth={2} />
        </motion.button>
        <motion.button
          onClick={handleZoomOut}
          className="p-2 bg-[#0f1621]/95 border border-[#1a2332] rounded-sm text-white/60 hover:text-white/90 hover:border-[#4a90e2]/50 backdrop-blur-sm transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ZoomOut className="w-4 h-4" strokeWidth={2} />
        </motion.button>
        <motion.button
          onClick={handleReset}
          className="p-2 bg-[#0f1621]/95 border border-[#1a2332] rounded-sm text-white/60 hover:text-white/90 hover:border-[#4a90e2]/50 backdrop-blur-sm transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Maximize2 className="w-4 h-4" strokeWidth={2} />
        </motion.button>
      </div>

      {/* Map */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 147,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          onMoveEnd={(position) => {
            setCenter(position.coordinates);
            setZoom(position.zoom);
          }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e3a5f"
                  stroke="#0a0e1a"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', fill: '#2a4a6f' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Render all routes */}
          {routes.map((route) => renderRouteLine(route, route === selectedRoute))}

          {/* Origin marker */}
          {origin && (
            <Marker coordinates={origin.coordinates}>
              <g>
                {/* Pulse ring */}
                <motion.circle
                  r="12"
                  fill="none"
                  stroke="#4a90e2"
                  strokeWidth="2"
                  opacity={0.5}
                  animate={{
                    r: [8, 16, 8],
                    opacity: [0.5, 0.1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                {/* Marker dot */}
                <circle r="6" fill="#4a90e2" />
                <text
                  textAnchor="middle"
                  y={-15}
                  style={{
                    fontFamily: 'system-ui',
                    fontSize: '10px',
                    fill: '#8ab4e5',
                    fontWeight: 500,
                  }}
                >
                  {origin.name}
                </text>
              </g>
            </Marker>
          )}

          {/* Destination marker */}
          {destination && (
            <Marker coordinates={destination.coordinates}>
              <g>
                {/* Pulse ring */}
                <motion.circle
                  r="12"
                  fill="none"
                  stroke="#c94444"
                  strokeWidth="2"
                  opacity={0.5}
                  animate={{
                    r: [8, 16, 8],
                    opacity: [0.5, 0.1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                  }}
                />
                {/* Marker dot */}
                <circle r="6" fill="#c94444" />
                <text
                  textAnchor="middle"
                  y={-15}
                  style={{
                    fontFamily: 'system-ui',
                    fontSize: '10px',
                    fill: '#e85555',
                    fontWeight: 500,
                  }}
                >
                  {destination.name}
                </text>
              </g>
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom level indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#0f1621]/95 border border-[#1a2332] rounded-sm backdrop-blur-sm">
        <span className="text-[10px] text-white/40 font-mono tracking-wider uppercase">
          Zoom: {zoom.toFixed(1)}x
        </span>
      </div>

      {/* Legend */}
      <RouteLegend />
    </div>
  );
}