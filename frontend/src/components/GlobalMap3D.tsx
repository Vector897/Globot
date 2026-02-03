import React, { useState, useEffect, useRef, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, SolidPolygonLayer, GeoJsonLayer, TextLayer, PathLayer } from '@deck.gl/layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { _GlobeView as GlobeView } from '@deck.gl/core';
import { CollisionFilterExtension } from '@deck.gl/extensions';
import { Route } from '../utils/routeCalculator';
import { Ship } from '../utils/shipData';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';

// Initial View State for Globe
const INITIAL_VIEW_STATE = {
  longitude: 60,
  latitude: 20,
  zoom: 1.5,
  minZoom: 0,
  maxZoom: 20
};

// ============================================
// Google Maps Dark Style Color Palette
// ============================================
// Land & Geography
const COLOR_LAND: [number, number, number] = [38, 43, 51]; // Dark gray land (Google Maps dark)
const COLOR_LAND_BORDER: [number, number, number, number] = [55, 62, 73, 200]; // Subtle country borders
const COLOR_WATER: [number, number, number] = [23, 27, 33]; // Dark water background

// Routes & Shipping
const COLOR_ROUTE_DEFAULT: [number, number, number, number] = [100, 116, 139, 180]; // Muted gray route
const COLOR_ROUTE_ACTIVE: [number, number, number, number] = [66, 133, 244, 255]; // Google blue for active routes

// Points of Interest
const COLOR_STRAIT: [number, number, number, number] = [251, 191, 36, 220]; // Warm amber for straits
const COLOR_PORT: [number, number, number] = [56, 189, 248]; // Cyan for ports
const COLOR_PORT_GLOW: [number, number, number, number] = [56, 189, 248, 60]; // Port glow

// Ships
const COLOR_SHIP: [number, number, number] = [255, 255, 255]; // White ships
const COLOR_SHIP_GLOW: [number, number, number, number] = [66, 133, 244, 80]; // Blue glow

// Crisis & Alerts
const COLOR_CRISIS: [number, number, number] = [239, 68, 68]; // Red for crisis
const COLOR_CRISIS_GLOW: [number, number, number, number] = [239, 68, 68, 40]; // Crisis zone glow

// Labels & UI
const COLOR_LABEL_PRIMARY: [number, number, number, number] = [180, 185, 195, 255]; // Country labels
const COLOR_GRATICULE: [number, number, number, number] = [60, 70, 85, 30]; // Very subtle grid

const NUM_SHIPS = 500;

interface GlobalMap3DProps {
  origin?: any;
  destination?: any;
  onRouteSelect?: (route: Route) => void;
  onRoutesCalculated?: (routes: Route[]) => void;
  selectedRouteFromParent?: Route | null;
}

export function GlobalMap3D({ 
    origin, 
    destination, 
    onRouteSelect, 
    onRoutesCalculated, 
    selectedRouteFromParent 
}: GlobalMap3DProps) {
  const [landData, setLandData] = useState<any[]>([]);
  const [routeData, setRouteData] = useState<any[]>([]);
  const [paths, setPaths] = useState<any>({});
  const [ships, setShips] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [straitsData, setStraitsData] = useState<any[]>([]);
  const [straitLabels, setStraitLabels] = useState<any[]>([]);
  const [portsData, setPortsData] = useState<any[]>([]);
  const [portLabels, setPortLabels] = useState<any[]>([]);
  const [labelScale, setLabelScale] = useState(0.4);
  const [allCrisisData, setAllCrisisData] = useState<any>({});
  const [activeCrises, setActiveCrises] = useState<any>({
    red_sea: false,
    hormuz: false,
    black_sea: false,
    covid_ports: false,
    ever_given: false,
    taiwan_strait: false
  });
  const [animTime, setAnimTime] = useState(0);
  const [shipSpeed, setShipSpeed] = useState(20); // Default 20 per request
  const [shipSize, setShipSize] = useState(2); // 1-10 scale
  
  // UI Panels State
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  // View State for zoom-responsive labels
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const currentZoom = viewState.zoom;

  // Animation Frame
  const requestRef = useRef<number>();
  const shipSpeedRef = useRef(shipSpeed); // Ref to track current speed for animation loop
  
  // Keep ref in sync with state
  useEffect(() => {
    shipSpeedRef.current = shipSpeed;
  }, [shipSpeed]);

  useEffect(() => {
    // 1. Fetch Land Cells
    fetch('/data/land_cells.json')
      .then(resp => resp.json())
      .then(data => {
        const list = Object.keys(data).map(h => ({
          hex: h,
          type: data[h].t,
          country: data[h].c
        }));
        setLandData(list);
      });

    // 2. Fetch Route Cells
    fetch('/data/route_cells.json')
      .then(resp => resp.json())
      .then(data => {
        const list = Object.keys(data).map(h => ({
          hex: h,
          type: data[h].t
        }));
        setRouteData(list);
      });

    // 3. Fetch Paths and Init Ships
    fetch('/data/paths.json')
      .then(resp => resp.json())
      .then(pathData => {
        setPaths(pathData);
        initShips(pathData);
      });

    // 4. Fetch Labels
    fetch('/data/country_labels.json')
      .then(resp => resp.json())
      .then(data => setLabels(data));

    // 5. Fetch Straits/Canals
    fetch('/data/straits_cells.json')
      .then(resp => resp.json())
      .then(data => {
        const list = Object.keys(data).map(h => ({
          hex: h,
          name: data[h].name
        }));
        setStraitsData(list);
      });

    // 6. Fetch Strait Labels
    fetch('/data/strait_labels.json')
      .then(resp => resp.json())
      .then(data => setStraitLabels(data));

    // 7. Fetch Port Cells
    fetch('/data/ports_cells.json')
      .then(resp => resp.json())
      .then(data => {
        const list = Object.keys(data).map(h => ({
          hex: h,
          name: data[h].name
        }));
        setPortsData(list);
      });

    // 8. Fetch Port Labels
    fetch('/data/port_labels.json')
      .then(resp => resp.json())
      .then(data => setPortLabels(data));

    // 9. Fetch All Crisis Zones
    fetch('/data/all_crisis_zones.json')
      .then(resp => resp.json())
      .then(data => setAllCrisisData(data));

    // Animation loop for pulsing effect
    const animLoop = () => {
      setAnimTime(t => t + 0.05);
      requestRef.current = requestAnimationFrame(animLoop);
    };
    requestRef.current = requestAnimationFrame(animLoop);
      
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const initShips = (pathData: any) => {
    const pathKeys = Object.keys(pathData);
    if (pathKeys.length === 0) return;

    const newShips = [];
    for (let i = 0; i < NUM_SHIPS; i++) {
      const randomPathKey = pathKeys[Math.floor(Math.random() * pathKeys.length)];
      const path = pathData[randomPathKey];
      newShips.push({
        id: i,
        pathId: randomPathKey, // Store route name for crisis coloring
        path: path,
        progress: Math.random(), // Start at random point
        speed: 0.0005 + Math.random() * 0.001, // Random speed
        reversed: Math.random() > 0.5 // 50% chance to go backwards
      });
    }
    setShips(newShips);
  };

  useEffect(() => {
    if (ships.length === 0) return;

    // Use interval for ship updates instead of recursive rAF inside animate to avoid double loops
    // consistent with 2D map adaptation
    const updateShips = () => {
        setShips(prevShips => {
        return prevShips.map(ship => {
            let newProgress = ship.progress + ship.speed * (shipSpeedRef.current / 2); // Use ref for current speed
            if (newProgress >= 1) newProgress = 0; // Loop
            return { ...ship, progress: newProgress };
        });
        });
    };
    const interval = setInterval(updateShips, 50); // ~20fps for ships

    return () => clearInterval(interval);
  }, [ships.length]);

  // Calculate Ship Positions
  const getShipData = () => {
    return ships.map(ship => {
      if (!ship.path || ship.path.length < 2) return null;
      
      const totalPoints = ship.path.length;
      
      // Handle direction
      let effectiveProgress = ship.progress;
      if (ship.reversed) {
          effectiveProgress = 1 - ship.progress;
      }

      const exactIndex = effectiveProgress * (totalPoints - 1);
      const index = Math.floor(exactIndex);
      const nextIndex = Math.min(index + 1, totalPoints - 1);
      const ratio = exactIndex - index;

      const p1 = ship.path[index]; // [lon, lat]
      const p2 = ship.path[nextIndex];

      const lon = p1[0] + (p2[0] - p1[0]) * ratio;
      const lat = p1[1] + (p2[1] - p1[1]) * ratio;

      return {
        position: [lon, lat],
        pathId: ship.pathId, // Pass route name for crisis coloring
        color: [255, 255, 0],
        angle: 0 // Optional: compute heading
      };
    }).filter(s => s !== null);
  };

  // Zoom-responsive label filtering (Google Maps style)
  // Show more labels as user zooms in
  const visibleLabels = useMemo(() => {
    const minSize = currentZoom < 1 ? 8 :     // Very zoomed out: major countries only
                    currentZoom < 2 ? 5 :      // Medium zoom: medium+ countries
                    currentZoom < 3 ? 2 :      // Closer zoom: most countries
                    0;                         // Very close: all countries
    return labels.filter((l: any) => (l.size || 0) > minSize);
  }, [labels, currentZoom]);

  // Optimize Layers: Group static layers to prevent re-instantiation every frame
  // Only recreate when data changes
  
  // Generate Graticule Data (Memoized)
  const graticuleData = useMemo(() => {
    const lines = [];
    for (let lon = -180; lon <= 180; lon += 10) {
      lines.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[lon, -90], [lon, 90]] }
      });
    }
    for (let lat = -80; lat <= 80; lat += 10) {
      const coords = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        coords.push([lon, lat]);
      }
      lines.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords }
      });
    }
    return lines as any;
  }, []);

  const graticuleLabels = useMemo(() => {
    const labels = [];
    // Longitude labels (at Equator)
    for (let lon = -180; lon <= 180; lon += 20) {
      if (lon === -180) continue;
      labels.push({
        text: `${Math.abs(lon)}°${lon < 0 ? 'W' : lon > 0 ? 'E' : ''}`,
        coordinates: [lon, 0]
      });
    }
    // Latitude labels (at Prime Meridian)
    for (let lat = -80; lat <= 80; lat += 20) {
      if (lat === 0) continue;
      labels.push({
        text: `${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'}`,
        coordinates: [0, lat]
      });
    }
    return labels;
  }, []);

  const staticLayers = useMemo(() => [
    // 1. Base Sphere (Google Maps Dark Water)
    new SolidPolygonLayer({
        id: 'background-water',
        data: [{ polygon: [[-180, 90], [180, 90], [180, -90], [-180, -90]] }],
        getPolygon: (d: any) => d.polygon,
        getFillColor: COLOR_WATER,
        stroked: false,
        filled: true,
        material: false,
        parameters: {
          depthTest: false
        }
    }),

    // 1.5 Graticule (Lat/Lon Grid) - Subtle
    new GeoJsonLayer({
        id: 'graticule-layer',
        data: graticuleData,
        stroked: true,
        filled: false,
        lineWidthMinPixels: 0.5,
        getLineColor: COLOR_GRATICULE,
        getLineWidth: 0.5
    }),

    // 1.6 Graticule Labels
    new TextLayer({
        id: 'graticule-label-layer',
        data: graticuleLabels,
        getPosition: (d: any) => [d.coordinates[0], d.coordinates[1], 1000],
        getText: (d: any) => d.text,
        getSize: 100000,
        sizeUnits: 'meters',
        sizeMinPixels: 8,
        sizeMaxPixels: 16,
        getColor: [80, 90, 105, 50],
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 'normal',
        billboard: true,
        background: false,
        parameters: {
            depthTest: false
        }
    }),

    // 2. Countries - Filled polygons (Google Maps style)
    new GeoJsonLayer({
        id: 'countries-fill',
        data: '/data/countries.geojson',
        filled: true,
        stroked: true,
        pickable: true,
        getFillColor: COLOR_LAND,
        getLineColor: COLOR_LAND_BORDER,
        getLineWidth: 15000,
        lineWidthMinPixels: 0.5,
        lineWidthMaxPixels: 1.5,
    }),

    // 3. Shipping Routes (PathLayer - clean lines)
    ...Object.entries(paths).map(([routeName, pathCoords]: [string, any]) => 
      new PathLayer({
        id: `route-${routeName.replace(/\s+/g, '-')}`,
        data: [{ path: pathCoords, name: routeName }],
        getPath: (d: any) => d.path,
        getColor: COLOR_ROUTE_DEFAULT,
        getWidth: 30000,
        widthMinPixels: 1.5,
        widthMaxPixels: 4,
        capRounded: true,
        jointRounded: true,
      pickable: true,
      })
    ),

    // 4. Port markers (glow effect)
    new ScatterplotLayer({
      id: 'port-glow-layer',
      data: portLabels,
      pickable: false,
      opacity: 0.4,
      stroked: false,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 16,
      getPosition: (d: any) => d.coordinates,
      getFillColor: COLOR_PORT_GLOW,
    }),

    // 4b. Port markers (core dots)
    new ScatterplotLayer({
      id: 'port-markers',
      data: portLabels,
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 6,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.coordinates,
      getFillColor: COLOR_PORT,
      getLineColor: [28, 33, 40, 255],
    }),

    // 5. Strait markers
    new ScatterplotLayer({
      id: 'strait-markers',
      data: straitLabels,
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 5,
      radiusMaxPixels: 10,
      lineWidthMinPixels: 1.5,
      getPosition: (d: any) => d.coordinates,
      getFillColor: COLOR_STRAIT,
      getLineColor: [28, 33, 40, 255],
    }),
  ], [paths, portLabels, straitLabels]); // Dependencies for static layers

  // Memoize Text Layers separately (depend on labels, labelScale, and currentZoom)
  const textLayers = useMemo(() => [
    // 7. Country Labels (Google Maps style - zoom-responsive)
    new TextLayer({
        id: 'country-labels',
        data: visibleLabels,
        pickable: true,
        getPosition: (d: any) => [d.coordinates[0], d.coordinates[1], 100000],
        getText: (d: any) => d.name.toUpperCase(),
        
        getSize: (d: any) => {
             const importance = d.size || 1;
             // Base size from country importance
             const baseSize = 30000 + importance * 8000;
             // Zoom factor: labels grow as you zoom in
             const zoomFactor = Math.pow(1.2, currentZoom - 1.5);
             return Math.min(150000, Math.max(25000, baseSize * zoomFactor * labelScale));
        },
        sizeUnits: 'meters', 
        sizeScale: 1, 
        sizeMinPixels: 6, 
        sizeMaxPixels: 80, 
        
        // Google Maps style: muted gray text
        getColor: [155, 160, 170, 230],
        outlineWidth: 1.2,
        outlineColor: [28, 33, 40, 180],
        
        background: false,
        billboard: true,
        
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: '400',
        characterSet: 'auto',
        
        extensions: [new CollisionFilterExtension()],
        collisionEnabled: true,
        getCollisionPriority: (d: any) => d.size || 0,
        collisionTestProps: {
            sizeScale: 2.5,
            sizeMaxPixels: 60,
            sizeMinPixels: 6
        },

        parameters: {
            depthTest: false
        }
    }),

    // 8. Strait/Canal Labels
    new TextLayer({
        id: 'strait-text-layer',
        data: straitLabels,
        pickable: true,
        getPosition: (d: any) => [d.coordinates[0], d.coordinates[1], 80000],
        getText: (d: any) => d.name,
        
        getSize: 60000 * labelScale,
        sizeUnits: 'meters', 
        sizeMinPixels: 10, 
        sizeMaxPixels: 100, 
        
        getColor: COLOR_STRAIT,
        outlineWidth: 1.5,
        outlineColor: [28, 33, 40, 220],
        
        background: false,
        
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: '500',
        
        extensions: [new CollisionFilterExtension()],
        collisionEnabled: true,
        getCollisionPriority: 15,
        collisionTestProps: {
            sizeScale: 2,
            sizeMaxPixels: 60,
            sizeMinPixels: 8
        },

        parameters: {
            depthTest: false
        }
    }),

    // 9. Port Labels
    new TextLayer({
        id: 'port-text-layer',
        data: portLabels,
        pickable: true,
        getPosition: (d: any) => [d.coordinates[0], d.coordinates[1], 70000],
        getText: (d: any) => d.name,
        
        getSize: 50000 * labelScale,
        sizeUnits: 'meters', 
        sizeMinPixels: 8, 
        sizeMaxPixels: 80, 
        
        getColor: [120, 200, 220, 255], // Light cyan
        outlineWidth: 1.5,
        outlineColor: [28, 33, 40, 220],
        
        background: false,
        
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: '400',
        
        extensions: [new CollisionFilterExtension()],
        collisionEnabled: true,
        getCollisionPriority: 10,
        collisionTestProps: {
            sizeScale: 2,
            sizeMaxPixels: 50,
            sizeMinPixels: 6
        },

        parameters: {
            depthTest: false
        }
    })
  ], [visibleLabels, straitLabels, portLabels, labelScale, currentZoom]);

  // Dynamic Layers (Recreate on every render mainly due to animTime/ships update)
  const dynamicLayers = [
    // 6. Crisis Zone Overlay (Translucent pulsing area)
    new H3HexagonLayer({
      id: 'crisis-layer',
      data: (() => {
        const cells: any[] = [];
        Object.keys(activeCrises).forEach(key => {
          if (activeCrises[key] && allCrisisData[key] && allCrisisData[key].cells) {
            allCrisisData[key].cells.forEach((cell: string) => cells.push({ hex: cell, scenario: key }));
          }
        });
        return cells;
      })(),
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: true,
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => [...COLOR_CRISIS, 180],
      getElevation: (d: any) => 30000,
      elevationScale: 1,
      opacity: 0.25 + 0.15 * Math.sin(animTime * 0.4),
      visible: Object.values(activeCrises).some(v => v),
      updateTriggers: {
        data: JSON.stringify(activeCrises) + Object.keys(allCrisisData).length,
        opacity: animTime
      }
    }),

    // 7. Ships glow effect
    new ScatterplotLayer({
      id: 'ship-glow-layer',
      data: getShipData(),
      pickable: false,
      opacity: 0.5,
      stroked: false,
      filled: true,
      radiusScale: 15000 * (shipSize / 5),
      radiusMinPixels: 5 + shipSize * 1.5,
      radiusMaxPixels: 10 + shipSize * 2,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => {
        if (d.pathId) {
          for (const key of Object.keys(activeCrises)) {
            if (activeCrises[key] && allCrisisData[key]) {
              const affected = allCrisisData[key].affected_routes || [];
              const isAffected = affected.some((r: any) => d.pathId.includes(r));
              if (isAffected) return COLOR_CRISIS_GLOW;
            }
          }
        }
        return COLOR_SHIP_GLOW;
      },
      updateTriggers: {
        getFillColor: [activeCrises, allCrisisData]
      }
    }),

    // 7b. Ships (core markers)
    new ScatterplotLayer({
      id: 'ship-layer',
      data: getShipData(),
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 8000 * (shipSize / 5),
      radiusMinPixels: 2 + shipSize,
      radiusMaxPixels: 4 + shipSize * 1.5,
      lineWidthMinPixels: 0.5,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => {
        if (d.pathId) {
          for (const key of Object.keys(activeCrises)) {
            if (activeCrises[key] && allCrisisData[key]) {
              const affected = allCrisisData[key].affected_routes || [];
              const isAffected = affected.some((r: any) => d.pathId.includes(r));
              if (isAffected) return COLOR_CRISIS;
            }
          }
        }
        return COLOR_SHIP;
      },
      getLineColor: [28, 33, 40, 200],
      updateTriggers: {
        getFillColor: [activeCrises, allCrisisData]
      }
    })
  ];

  const layers = [...staticLayers, ...textLayers, ...dynamicLayers];

  const toggleCrisis = (key: string) => {
    setActiveCrises((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  // Controller Settings Memoized
  // dragPan: false -> Forces left click to rotate (since touchRotate/dragRotate is true)
  // scrollZoom: smooth -> Enables smooth zooming
  // inertia: true -> Enables momentum after drag
  const controllerSettings = useMemo(() => ({
    touchRotate: true,
    scrollZoom: { smooth: true, speed: 0.05 }, // Smooth silky zoom
    dragPan: true, // Re-enable dragPan for spinning the globe
    dragRotate: true,
    doubleClickZoom: true,
    inertia: true
  }), []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#171b21' }}>
      {/* Subtle vignette overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 5,
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.25) 100%)',
        }}
      />
      
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) => setViewState(newViewState as typeof INITIAL_VIEW_STATE)}
        controller={controllerSettings}
        layers={layers}
        // @ts-ignore
        views={new GlobeView()}
        getTooltip={({object}: any) => {
             if (!object) return null;
             if (object.hex) return `Cell: ${object.hex}\nCountry: ${object.country || 'N/A'}`;
             if (object.name) return { text: `Country: ${object.name}` };
             if (object.properties?.NAME) return { text: `Region: ${object.properties.NAME}` };
             return null;
        }}
      />
      
      {/* UI Overlay - Left Panel */}
      <div style={{
          position: 'absolute', 
          top: 20, 
          left: 20, 
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
      }}>
          <button 
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className="map-toggle-btn"
          >
            <span style={{ fontSize: '10px' }}>{showLeftPanel ? '▼' : '▶'}</span>
            Map Controls
          </button>

          {showLeftPanel && (
              <div className="map-panel" style={{ maxWidth: '280px', marginTop: '8px' }}>
                  <div className="map-panel-header">
                    <span>3D Globe View</span>
                    <span className="map-view-label">GLOBE</span>
                  </div>
                  
                  <div className="map-panel-content">
                    {/* Stats */}
                    <div className="map-stats">
                      <div className="map-stat">Shipping Routes: <span className="map-stat-value">{Object.keys(paths).length}</span></div>
                      <div className="map-stat">Major Ports: <span className="map-stat-value">{portLabels.length}</span></div>
                      <div className="map-stat">Active Vessels: <span className="map-stat-value">{ships.length}</span></div>
                      <div className="map-stat">View Mode: <span className="map-stat-value">3D Globe</span></div>
                    </div>
                    
                    {/* Sliders */}
                    <div className="map-slider-container">
                      <div className="map-slider-label">
                        <span>Label Size</span>
                        <span>{labelScale.toFixed(1)}x</span>
                      </div>
                    <input 
                        type="range" 
                          className="map-slider"
                        min="0.1" max="1" step="0.1" 
                        value={labelScale} 
                        onChange={(e) => setLabelScale(parseFloat(e.target.value))}
                    />
                </div>

                    <div className="map-slider-container">
                      <div className="map-slider-label">
                        <span>Ship Speed</span>
                        <span>{shipSpeed}</span>
                      </div>
                    <input 
                        type="range" 
                          className="map-slider"
                        min="5" max="50" step="1" 
                        value={shipSpeed} 
                        onChange={(e) => setShipSpeed(parseInt(e.target.value))}
                    />
                </div>

                    <div className="map-slider-container">
                      <div className="map-slider-label">
                        <span>Ship Size</span>
                        <span>{shipSize}</span>
                      </div>
                    <input 
                        type="range" 
                          className="map-slider"
                        min="1" max="10" step="1" 
                        value={shipSize} 
                        onChange={(e) => setShipSize(parseInt(e.target.value))}
                    />
                </div>

                    <div className="map-divider" />

                    {/* Legend */}
                    <div className="map-section-header">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                      Legend
                    </div>
                    
                    <div className="map-legend-item">
                      <div className="map-legend-color" style={{background: 'rgb(38, 43, 51)'}} />
                      <span>Countries</span>
                    </div>
                    <div className="map-legend-item">
                      <div style={{width: '16px', height: '2px', background: 'rgb(100, 116, 139)', borderRadius: '1px'}} />
                      <span>Shipping Routes</span>
                    </div>
                    <div className="map-legend-item">
                      <div className="map-legend-color circle" style={{background: 'rgb(251, 191, 36)', width: '8px', height: '8px'}} />
                      <span>Straits & Canals</span>
                    </div>
                    <div className="map-legend-item">
                      <div className="map-legend-color circle" style={{background: 'rgb(56, 189, 248)', width: '6px', height: '6px'}} />
                      <span>Major Ports</span>
                    </div>
                    <div className="map-legend-item">
                      <div className="map-legend-color circle" style={{background: 'rgb(255, 255, 255)', boxShadow: '0 0 4px rgba(66, 133, 244, 0.6)', width: '5px', height: '5px'}} />
                      <span>Vessels</span>
                    </div>
                    {Object.values(activeCrises).some(v => v) && (
                      <div className="map-legend-item">
                        <div className="map-legend-color" style={{background: 'rgba(239, 68, 68, 0.5)'}} />
                        <span>Crisis Zone</span>
                      </div>
                    )}
                </div>
            </div>
          )}
      </div>
      
      {/* Right-side Crisis Scenarios Panel */}
      <div style={{
          position: 'absolute', 
          top: 20, 
          right: 20, 
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end'
      }}>
          <button 
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="map-toggle-btn"
          >
            <span style={{ fontSize: '10px' }}>{showRightPanel ? '▼' : '◀'}</span>
            Crisis Scenarios
          </button>
          
          {showRightPanel && (
              <div className="map-panel" style={{ minWidth: '220px', marginTop: '8px' }}>
                  <div className="map-panel-header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Scenarios
                    </span>
                    <span style={{ 
                      fontSize: '10px', 
                      color: Object.values(activeCrises).some(v => v) ? '#fca5a5' : '#64748b',
                      fontWeight: '500'
                    }}>
                      {Object.values(activeCrises).filter(v => v).length} active
                    </span>
                  </div>
                  
                  <div className="map-panel-content">
                  {[
                    { id: 'red_sea', label: 'Red Sea Crisis', year: '2023-2024' },
                    { id: 'hormuz', label: 'Hormuz Tension', year: '2011-2012' },
                    { id: 'black_sea', label: 'Ukraine War', year: '2022-now' },
                    { id: 'covid_ports', label: 'COVID Congestion', year: '2021' },
                    { id: 'ever_given', label: 'Ever Given Suez', year: 'Mar 2021' },
                    { id: 'taiwan_strait', label: 'Taiwan Strait', year: 'Hypothetical' }
                  ].map(crisis => (
                      <button 
                      key={crisis.id}
                      onClick={() => toggleCrisis(crisis.id)}
                        className={`map-crisis-btn ${activeCrises[crisis.id] ? 'active' : ''}`}
                        role="switch"
                        aria-checked={activeCrises[crisis.id]}
                        aria-label={`${crisis.label} scenario (${crisis.year}) - ${activeCrises[crisis.id] ? 'active' : 'inactive'}`}
                    >
                      <span>{crisis.label}</span>
                        <span className="map-crisis-year">{crisis.year}</span>
                      </button>
                  ))}
                  
                    <p className="map-hint">
                      Click to toggle scenario overlays
                    </p>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}