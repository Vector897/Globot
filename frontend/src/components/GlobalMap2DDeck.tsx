import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, PathLayer, ScatterplotLayer, TextLayer, IconLayer } from '@deck.gl/layers';
import { MapView } from '@deck.gl/core';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { calculateRoutes, Route } from '../utils/routeCalculator';
import { MOCK_SHIPS, Ship } from '../utils/shipData';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const COUNTRIES_URL = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson';

// Ship arrow icon as SVG data URL
// 船舶箭头图标 SVG 数据 URL
const SHIP_ARROW_ICON = {
  url: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M16 2 L28 28 L16 22 L4 28 Z" fill="white" stroke="#0a0e1a" stroke-width="1.5"/>
    </svg>
  `),
  width: 32,
  height: 32,
  anchorY: 16,
  anchorX: 16,
};

// Ship icon atlas for different statuses
const SHIP_ICON_MAPPING = {
  normal: { ...SHIP_ARROW_ICON, mask: true },
  'at-risk': { ...SHIP_ARROW_ICON, mask: true },
  diverting: { ...SHIP_ARROW_ICON, mask: true },
};

// --- Helper for Path Interpolation ---
const getPositionAlongPath = (path: [number, number][], progress: number): [number, number, number] | null => {
  if (!path || path.length < 2) return null;
  
  const totalSegments = path.length - 1;
  const exactSegment = progress * totalSegments;
  const segmentIndex = Math.min(Math.floor(exactSegment), totalSegments - 1);
  const segmentProgress = exactSegment - segmentIndex;

  const start = path[segmentIndex];
  const end = path[segmentIndex + 1];

  const lng = start[0] + (end[0] - start[0]) * segmentProgress;
  const lat = start[1] + (end[1] - start[1]) * segmentProgress;

  // Calculate heading
  const dLng = end[0] - start[0];
  const dLat = end[1] - start[1];
  const heading = Math.atan2(dLng, dLat) * (180 / Math.PI);

  return [lng, lat, heading];
};

// Route Legend Component
const RouteLegend = () => (
  <div className="absolute bottom-6 left-6 p-4 bg-[#0f1621]/95 border border-[#1a2332] rounded-lg backdrop-blur-sm z-10 max-w-[280px]">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-full bg-[#1a2332] flex items-center justify-center">
        <span className="text-[10px]">✈</span>
      </div>
      <span className="text-xs text-white/60 uppercase tracking-wider font-medium">航线图例</span>
      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-auto" />
    </div>
    
    <div className="space-y-2 text-[11px]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-red-500" />
        </div>
        <span className="text-white/70">高风险航线</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-amber-500" />
        </div>
        <span className="text-white/70">备选航线</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-emerald-500" />
        </div>
        <span className="text-white/70">安全航线</span>
      </div>
    </div>
  </div>
);

interface Port {
  name: string;
  coordinates: [number, number];
}

export interface CustomMarker {
  id: string;
  coordinates: [number, number]; // [longitude, latitude]
  name?: string;
  color?: string;
  size?: number;
  icon?: React.ReactNode;
  onClick?: () => void;
}

interface GlobalMap2DDeckProps {
  origin?: Port;
  destination?: Port;
  onRouteSelect?: (route: Route) => void;
  onRoutesCalculated?: (routes: Route[]) => void;
  selectedRouteFromParent?: Route | null;
  currentTime?: number;
  onShipSelect?: (ship: Ship) => void;
  customMarkers?: CustomMarker[];
}

// Initial view state
const INITIAL_VIEW_STATE = {
  longitude: 50,
  latitude: 20,
  zoom: 1.2,
  pitch: 0,
  bearing: 0,
  minZoom: 0.5,
  maxZoom: 8,
};

export function GlobalMap2DDeck({
  origin,
  destination,
  onRouteSelect,
  onRoutesCalculated,
  selectedRouteFromParent,
  currentTime = 0,
  onShipSelect,
  customMarkers = []
}: GlobalMap2DDeckProps) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [activeShips, setActiveShips] = useState<any[]>([]);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Animation loop for pulsing effects
  useEffect(() => {
    let animationFrameId: number;
    let start = performance.now();

    const animate = (time: number) => {
      const elapsed = time - start;
      setPulsePhase((elapsed % 2000) / 2000); // 0 to 1 over 2 seconds
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Route Calculation
  useEffect(() => {
    if (origin && destination) {
      try {
        const calculatedRoutes = calculateRoutes(origin.coordinates, destination.coordinates);
        setRoutes(calculatedRoutes);

        const bestRoute = calculatedRoutes.find((r) => r.riskLevel === 'low') || calculatedRoutes[0];
        setSelectedRouteId(bestRoute.id);

        if (onRoutesCalculated) onRoutesCalculated(calculatedRoutes);
        if (onRouteSelect) onRouteSelect(bestRoute);

        // Smart Centering
        const isPacificRoute = Math.abs(origin.coordinates[0] - destination.coordinates[0]) > 180;
        if (isPacificRoute) {
          setViewState(prev => ({ ...prev, longitude: 180, latitude: 20, zoom: 1.2 }));
        } else {
          const midLng = (origin.coordinates[0] + destination.coordinates[0]) / 2;
          const midLat = (origin.coordinates[1] + destination.coordinates[1]) / 2;
          setViewState(prev => ({ ...prev, longitude: midLng, latitude: midLat, zoom: 1.2 }));
        }
      } catch (e) {
        console.error("Error calculating routes", e);
      }
    } else {
      setRoutes([]);
      setSelectedRouteId(null);
    }
  }, [origin, destination]);

  useEffect(() => {
    if (selectedRouteFromParent) {
      setSelectedRouteId(selectedRouteFromParent.id);
    }
  }, [selectedRouteFromParent]);

  // Update Ships
  useEffect(() => {
    if (routes.length === 0) {
      setActiveShips([]);
      return;
    }

    const newShips = MOCK_SHIPS.filter(ship => 
      routes.some(r => r.id === ship.routeId) || 
      (ship.routeId.startsWith('fixed-') && routes.length > 0)
    ).map(ship => {
      const route = routes.find(r => r.id === ship.routeId) || routes[0];
      
      const loopTime = 60000;
      const offset = (ship.id.charCodeAt(ship.id.length - 1) * 1000);
      const now = Date.now();
      let progress = ((now + offset) % loopTime) / loopTime;
      
      if (ship.direction === -1) progress = 1 - progress;

      const posData = getPositionAlongPath(route.waypoints, progress);
      
      if (posData) {
        return {
          ...ship,
          position: [posData[0], posData[1]],
          heading: posData[2]
        };
      }
      return null;
    }).filter(s => s !== null);

    setActiveShips(newShips as any[]);
  }, [routes, pulsePhase]);

  const handleRouteClick = useCallback((route: Route) => {
    setSelectedRouteId(route.id);
    if (onRouteSelect) onRouteSelect(route);
  }, [onRouteSelect]);

  const handleZoomIn = () => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.5, 8) }));
  const handleZoomOut = () => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.5, 0.5) }));
  const handleReset = () => setViewState(INITIAL_VIEW_STATE);

  // Get route color based on risk level
  const getRouteColor = (route: Route, isSelected: boolean): [number, number, number, number] => {
    const alpha = isSelected ? 255 : 150;
    switch (route.riskLevel) {
      case 'high': return [239, 68, 68, alpha];    // Red
      case 'medium': return [245, 158, 11, alpha]; // Amber
      case 'low': return [16, 185, 129, alpha];    // Green
      default: return [100, 100, 100, alpha];
    }
  };

  // Build layers
  const layers = useMemo(() => {
    const layerList: any[] = [];

    // 1. Base Map - Country boundaries
    layerList.push(
      new GeoJsonLayer({
        id: 'countries',
        data: COUNTRIES_URL,
        stroked: true,
        filled: true,
        lineWidthMinPixels: 0.5,
        getLineColor: [10, 14, 26, 255],
        getFillColor: [30, 58, 95, 255], // #1e3a5f
        pickable: false,
      })
    );

    // 2. Routes as PathLayer
    routes.forEach((route, index) => {
      const isSelected = route.id === selectedRouteId;
      const color = getRouteColor(route, isSelected);
      
      layerList.push(
        new PathLayer({
          id: `route-${route.id}`,
          data: [{ path: route.waypoints }],
          getPath: (d: any) => d.path,
          getColor: color,
          getWidth: isSelected ? 4 : 2,
          widthMinPixels: isSelected ? 3 : 1.5,
          pickable: true,
          onClick: () => handleRouteClick(route),
          // Enable world wrap for infinite scroll
          wrapLongitude: true,
        })
      );
    });

    // 3. Origin and Destination markers
    const portMarkers: Array<{
      position: [number, number];
      name: string;
      color: [number, number, number];
      type: string;
    }> = [];
    if (origin) {
      portMarkers.push({
        position: origin.coordinates,
        name: origin.name,
        color: [59, 130, 246], // Blue
        type: 'origin'
      });
    }
    if (destination) {
      portMarkers.push({
        position: destination.coordinates,
        name: destination.name,
        color: [239, 68, 68], // Red
        type: 'destination'
      });
    }

    if (portMarkers.length > 0) {
      // Port circles
      layerList.push(
        new ScatterplotLayer({
          id: 'port-markers',
          data: portMarkers,
          getPosition: (d) => d.position,
          getFillColor: (d) => [...d.color, 255] as [number, number, number, number],
          getRadius: 80000,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          pickable: true,
          wrapLongitude: true,
        })
      );

      // Port labels
      layerList.push(
        new TextLayer({
          id: 'port-labels',
          data: portMarkers,
          getPosition: (d: any) => d.position,
          getText: (d: any) => d.name,
          getSize: 14,
          getColor: [255, 255, 255, 200],
          getPixelOffset: [0, -25],
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 'bold',
          wrapLongitude: true,
        })
      );
    }

    // 4. Ships as directional arrows
    // 船舶显示为带方向的箭头
    if (activeShips.length > 0) {
      // Ship arrow icons with rotation based on heading
      layerList.push(
        new IconLayer({
          id: 'ships',
          data: activeShips,
          getPosition: (d: any) => d.position,
          getIcon: () => 'arrow',
          getSize: 28,
          sizeMinPixels: 16,
          sizeMaxPixels: 40,
          // Rotate arrow based on ship heading (航向)
          getAngle: (d: any) => -(d.heading || 0), // Negative because deck.gl rotates clockwise
          getColor: (d: any) => {
            if (d.status === 'At Risk') return [239, 68, 68, 255];     // Red
            if (d.status === 'Diverting') return [249, 115, 22, 255]; // Orange
            return [255, 255, 255, 255];                               // White
          },
          iconAtlas: SHIP_ARROW_ICON.url,
          iconMapping: {
            arrow: { x: 0, y: 0, width: 32, height: 32, anchorY: 16, mask: true }
          },
          pickable: true,
          onClick: (info: any) => {
            if (onShipSelect && info.object) {
              onShipSelect(info.object);
            }
          },
          wrapLongitude: true,
          billboard: false, // Keep arrow flat on map
        })
      );

      // At-risk ship pulse effect
      const atRiskShips = activeShips.filter((s: any) => s.status === 'At Risk' || s.status === 'Diverting');
      if (atRiskShips.length > 0) {
        const pulseScale = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.3;
        layerList.push(
          new ScatterplotLayer({
            id: 'ships-pulse',
            data: atRiskShips,
            getPosition: (d: any) => d.position,
            getFillColor: [0, 0, 0, 0],
            getLineColor: (d: any) => {
              if (d.status === 'At Risk') return [239, 68, 68, Math.floor(150 * (1 - pulsePhase))];
              return [249, 115, 22, Math.floor(150 * (1 - pulsePhase))];
            },
            getRadius: 80000 * pulseScale,
            radiusMinPixels: 20 * pulseScale,
            stroked: true,
            lineWidthMinPixels: 2,
            filled: false,
            wrapLongitude: true,
            updateTriggers: {
              getRadius: [pulsePhase],
              getLineColor: [pulsePhase],
            }
          })
        );
      }

      // Ship labels
      layerList.push(
        new TextLayer({
          id: 'ship-labels',
          data: activeShips,
          getPosition: (d: any) => d.position,
          getText: (d: any) => d.name,
          getSize: 11,
          getColor: [255, 255, 255, 180],
          getPixelOffset: [0, -22],
          fontFamily: 'system-ui, sans-serif',
          wrapLongitude: true,
        })
      );
    }

    // 5. Custom Markers
    if (customMarkers.length > 0) {
      // Marker circles with pulse effect
      const pulseSize = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.3;
      
      layerList.push(
        new ScatterplotLayer({
          id: 'custom-markers-pulse',
          data: customMarkers,
          getPosition: (d: CustomMarker) => d.coordinates,
          getFillColor: [0, 0, 0, 0] as [number, number, number, number],
          getLineColor: (d: CustomMarker) => {
            const color = d.color || '#10b981';
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return [r, g, b, Math.floor(100 * (1 - pulsePhase))] as [number, number, number, number];
          },
          getRadius: (d: CustomMarker) => ((d.size || 8) * 15000) * pulseSize,
          radiusMinPixels: 12 * pulseSize,
          stroked: true,
          lineWidthMinPixels: 2,
          filled: false,
          wrapLongitude: true,
          updateTriggers: {
            getRadius: [pulsePhase],
            getLineColor: [pulsePhase],
          }
        })
      );

      layerList.push(
        new ScatterplotLayer({
          id: 'custom-markers',
          data: customMarkers,
          getPosition: (d: CustomMarker) => d.coordinates,
          getFillColor: (d: CustomMarker) => {
            const color = d.color || '#10b981';
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return [r, g, b, 255] as [number, number, number, number];
          },
          getRadius: (d: CustomMarker) => (d.size || 8) * 10000,
          radiusMinPixels: 6,
          radiusMaxPixels: 15,
          pickable: true,
          onClick: (info: any) => {
            if (info.object && info.object.onClick) {
              info.object.onClick();
            }
          },
          wrapLongitude: true,
        })
      );

      // Custom marker labels
      layerList.push(
        new TextLayer({
          id: 'custom-marker-labels',
          data: customMarkers.filter(m => m.name),
          getPosition: (d: CustomMarker) => d.coordinates,
          getText: (d: CustomMarker) => d.name || '',
          getSize: 12,
          getColor: (d: CustomMarker) => {
            const color = d.color || '#10b981';
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return [r, g, b, 255];
          },
          getPixelOffset: [0, -20],
          fontFamily: 'system-ui, sans-serif',
          fontWeight: '500',
          wrapLongitude: true,
        })
      );
    }

    return layerList;
  }, [routes, selectedRouteId, origin, destination, activeShips, customMarkers, pulsePhase, handleRouteClick, onShipSelect]);

  return (
    <div className="relative w-full h-full bg-[#0a0e1a] overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid-deck" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a90e2" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-deck)" />
        </svg>
      </div>

      {/* Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
        <button onClick={handleZoomIn} className="p-2 bg-[#0f1621]/95 border border-[#1a2332] rounded-sm text-white/60 hover:text-white/90 hover:border-[#4a90e2]/50 backdrop-blur-sm transition-all">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={handleZoomOut} className="p-2 bg-[#0f1621]/95 border border-[#1a2332] rounded-sm text-white/60 hover:text-white/90 hover:border-[#4a90e2]/50 backdrop-blur-sm transition-all">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={handleReset} className="p-2 bg-[#0f1621]/95 border border-[#1a2332] rounded-sm text-white/60 hover:text-white/90 hover:border-[#4a90e2]/50 backdrop-blur-sm transition-all">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* DeckGL Map with infinite scroll */}
      <DeckGL
        views={new MapView({ 
          repeat: true,  // Enable infinite horizontal scroll!
          controller: true
        })}
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) => setViewState(newViewState as any)}
        layers={layers}
        controller={{
          dragPan: true,
          dragRotate: false,
          scrollZoom: true,
          doubleClickZoom: true,
          touchZoom: true,
          touchRotate: false,
          keyboard: true,
        }}
        getCursor={({ isDragging, isHovering }) => 
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
        }
        style={{ position: 'absolute', inset: '0' }}
      />

      {/* HUD Info */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#0f1621]/95 border border-[#1a2332] rounded-sm backdrop-blur-sm pointer-events-none z-10">
        <span className="text-[10px] text-white/40 font-mono tracking-wider uppercase">
          Zoom: {viewState.zoom.toFixed(1)}x | 无限滚动: ✓
        </span>
      </div>

      <RouteLegend />
    </div>
  );
}

export default GlobalMap2DDeck;

