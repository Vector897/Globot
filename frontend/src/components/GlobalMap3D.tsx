import React, { useState, useEffect, useRef, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, SolidPolygonLayer, GeoJsonLayer, TextLayer } from '@deck.gl/layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { _GlobeView as GlobeView } from '@deck.gl/core';
import { CollisionFilterExtension } from '@deck.gl/extensions';
import { Route } from '../utils/routeCalculator';
import { Ship } from '../utils/shipData';

// Initial View State for Globe
const INITIAL_VIEW_STATE = {
  longitude: 121.47,
  latitude: 31.23,
  zoom: 1.5,
  minZoom: 0,
  maxZoom: 20
};

// Colors
const COLOR_LAND: [number, number, number] = [46, 204, 113];
const COLOR_ROUTE: [number, number, number, number] = [52, 152, 219, 150];
const COLOR_SEA_BASE: [number, number, number] = [20, 30, 60]; 
const COLOR_OCEAN_POLY: [number, number, number, number] = [30, 40, 80, 100]; // Semi-transparent for marine regions
const COLOR_BORDER: [number, number, number, number] = [255, 255, 255, 200];
const COLOR_STRAIT: [number, number, number] = [255, 165, 0]; // Orange for Straits/Canals
const COLOR_PORT: [number, number, number] = [128, 0, 128]; // Purple for Ports
const COLOR_CRISIS: [number, number, number] = [255, 0, 0]; // Red for Crisis Zone

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

  // Filter labels for rendering (remove tiny islands)
  // useMemo for filtering to avoid recalc every frame
  const visibleLabels = useMemo(() => labels.filter((l: any) => l.size > 1.5), [labels]);

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
    // 1. Base Sphere (Darkest Blue)
    new SolidPolygonLayer({
        id: 'background-sea',
        data: [{ polygon: [[-180, 90], [180, 90], [180, -90], [-180, -90]] }],
        getPolygon: (d: any) => d.polygon,
        getFillColor: COLOR_SEA_BASE,
        stroked: false,
        filled: true,
        material: false,
        // Fix Z-fighting: Render this background layer behind everything
        parameters: {
          depthTest: false
        }
    }),

    // 1.5 Graticule (Lat/Lon Grid)
    new GeoJsonLayer({
        id: 'graticule-layer',
        data: graticuleData,
        stroked: true,
        filled: false,
        lineWidthMinPixels: 1,
        getLineColor: [255, 255, 255, 20], // Very faint white
        getLineWidth: 1
    }),

    // 1.6 Graticule Labels
    new TextLayer({
        id: 'graticule-label-layer',
        data: graticuleLabels,
        getPosition: (d: any) => [d.coordinates[0], d.coordinates[1], 1000], // Slightly elevated
        getText: (d: any) => d.text,
        getSize: 100000, // Meters in 3D
        sizeUnits: 'meters',
        sizeMinPixels: 10,
        sizeMaxPixels: 20,
        getColor: [255, 255, 255, 90], // Semi-transparent white
        fontFamily: 'Arial',
        fontWeight: 'normal',
        billboard: true,
        background: false,
        parameters: {
            depthTest: false // Prevent Z-fighting with ocean
        }
    }),

    // 2. Ocean Regions (Marine Polygons)
    new GeoJsonLayer({
        id: 'ocean-layer',
        data: '/data/oceans.geojson',
        filled: true,
        stroked: true,
        getFillColor: COLOR_OCEAN_POLY,
        getLineColor: [255, 255, 255, 20],
        getLineWidth: 1,
        lineWidthMinPixels: 0,
        opacity: 0.3,
        // Fix Z-fighting: Offset slightly above background but below land
        getPolygonOffset: ({layerIndex}) => [0, -100]
    }),

    // 3. Land (Extruded H3)
    new H3HexagonLayer({
      id: 'land-layer',
      data: landData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: true,
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => COLOR_LAND,
      getElevation: (d: any) => d.country === 'ATA' ? 50000 : 20000, 
      elevationScale: 1,
      opacity: 1
    }),
    
    // 4. Country Borders (Lines)
    new GeoJsonLayer({
        id: 'border-layer',
        data: '/data/countries.geojson',
        filled: false,
        stroked: true,
        getLineWidth: 20000, 
        lineWidthMinPixels: 1.5,
        getLineColor: COLOR_BORDER,
        extruded: false, 
        parameters: {
             depthTest: false 
        },
    }),

    // 5. Routes (Extruded H3)
    new H3HexagonLayer({
      id: 'route-layer',
      data: routeData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: false,
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => COLOR_ROUTE,
      getElevation: (d: any) => 1000, 
      opacity: 0.8
    }),

    // 5.5 Straits & Canals (Orange - Elevated above land)
    new H3HexagonLayer({
      id: 'strait-layer',
      data: straitsData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: true, // Elevated to appear above land
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => COLOR_STRAIT,
      getElevation: (d: any) => 25000, // Above land extrusion (20km)
      elevationScale: 1,
      opacity: 0.5 // Semi-transparent to show ships
    }),

    // 5.6 Ports (Purple - Elevated above land)
    new H3HexagonLayer({
      id: 'port-layer',
      data: portsData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: true, // Elevated to appear above land
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => COLOR_PORT,
      getElevation: (d: any) => 25000, // Above land extrusion (20km)
      elevationScale: 1,
      opacity: 0.5 // Semi-transparent to show ships
    })
  ], [landData, routeData, straitsData, portsData]); // Dependencies for static layers

  // Memoize Text Layers separately (depend on labels and labelScale)
  // This prevents recreating CollisionFilter props every frame which causes expensive re-sorting
  const textLayers = useMemo(() => [
    // 7. Labels
    new TextLayer({
        id: 'text-layer',
        data: visibleLabels,
        pickable: true,
        getPosition: (d: any) => [d.coordinates[0], d.coordinates[1], 100000], // Higher elevation to prevent occlusion
        getText: (d: any) => d.name,
        
        // Dynamic scaling (Meters)
        getSize: (d: any) => {
             const s = d.size || 1;
             return (50000 + (s * 30000)) * labelScale;
        },
        sizeUnits: 'meters', 
        sizeScale: 1, 
        sizeMinPixels: 0, 
        sizeMaxPixels: 200, 
        
        getColor: [255, 255, 255, 255], // White
        outlineWidth: 2,
        outlineColor: [0, 0, 0, 200], // Black outline
        
        background: false,
        billboard: true, // Labels face camera (prevents upside-down text)
        
        fontFamily: 'Inter, system-ui',
        fontWeight: 'bold',
        
        // Collision Handling
        extensions: [new CollisionFilterExtension()],
        collisionEnabled: true,
        getCollisionPriority: (d: any) => d.size || 0, // Prioritize larger countries
        collisionTestProps: {
            sizeScale: 4,
            sizeMaxPixels: 100,
            sizeMinPixels: 10
        },

        parameters: {
            depthTest: false
        }
    }),

    // 8. Strait/Canal Labels (Orange text with dark outline)
    new TextLayer({
        id: 'strait-text-layer',
        data: straitLabels,
        pickable: true,
        getPosition: (d: any) => [d.coordinates[0], d.coordinates[1], 80000],
        getText: (d: any) => d.name,
        
        getSize: 80000 * labelScale,
        sizeUnits: 'meters', 
        sizeMinPixels: 12, 
        sizeMaxPixels: 150, 
        
        // Red bold text with black outline
        getColor: [255, 0, 0, 255], // Red fill
        outlineWidth: 2,
        outlineColor: [0, 0, 0, 255], // Black outline
        
        background: false,
        
        fontFamily: 'Inter, system-ui',
        fontWeight: 'bold',
        
        // Collision Handling
        extensions: [new CollisionFilterExtension()],
        collisionEnabled: true,
        getCollisionPriority: (d: any) => 10, // Medium priority
        collisionTestProps: {
            sizeScale: 4,
            sizeMaxPixels: 100,
            sizeMinPixels: 10
        },

        parameters: {
            depthTest: false
        }
    }),

    // 9. Port Labels (Red bold text)
    new TextLayer({
        id: 'port-text-layer',
        data: portLabels,
        pickable: true,
        getPosition: (d: any) => [d.coordinates[0], d.coordinates[1], 70000],
        getText: (d: any) => d.name,
        
        getSize: 60000 * labelScale,
        sizeUnits: 'meters', 
        sizeMinPixels: 10, 
        sizeMaxPixels: 120, 
        
        // Orange bold text with black outline
        getColor: [255, 165, 0, 255], // Orange fill
        outlineWidth: 2,
        outlineColor: [0, 0, 0, 255], // Black outline
        
        background: false,
        
        fontFamily: 'Inter, system-ui',
        fontWeight: 'bold',
        
        // Collision Handling
        extensions: [new CollisionFilterExtension()],
        collisionEnabled: true,
        getCollisionPriority: (d: any) => 20, // High priority for ports
        collisionTestProps: {
            sizeScale: 4,
            sizeMaxPixels: 100,
            sizeMinPixels: 10
        },

        parameters: {
            depthTest: false
        }
    })
  ], [visibleLabels, straitLabels, portLabels, labelScale]);

  // Dynamic Layers (Recreate on every render mainly due to animTime/ships update)
  const dynamicLayers = [
    // 6.5 Crisis Zone (Pulsing Red - renders all active scenarios)
    new H3HexagonLayer({
      id: 'crisis-layer',
      data: (() => {
        // Collect cells from all active crises
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
      getFillColor: (d: any) => [255, 0, 0, 255],
      getElevation: (d: any) => 40000, // Higher than other layers
      elevationScale: 1,
      opacity: 0.6 + 0.3 * Math.sin(animTime * 0.33),
      visible: Object.values(activeCrises).some(v => v),
      updateTriggers: {
        data: JSON.stringify(activeCrises) + Object.keys(allCrisisData).length,
        opacity: animTime
      }
    }),

    // 6. Ships
    new ScatterplotLayer({
      id: 'ship-layer',
      data: getShipData(),
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 10000 * (shipSize / 5), // Apply size multiplier
      radiusMinPixels: 2 + shipSize,
      radiusMaxPixels: 5 + shipSize * 2,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => {
        // Check if any active crisis affects this ship's route
        if (d.pathId) {
          for (const key of Object.keys(activeCrises)) {
            if (activeCrises[key] && allCrisisData[key]) {
              const affected = allCrisisData[key].affected_routes || [];
              const isAffected = affected.some((r: any) => d.pathId.includes(r));
              if (isAffected) return [255, 0, 0]; // Red
            }
          }
        }
        return [255, 255, 0]; // Normal yellow
      },
      getLineColor: (d: any) => [0, 0, 0],
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
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#020204' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
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
      
      {/* UI Overlay */}
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
            style={{
                background: 'rgba(15, 22, 33, 0.9)',
                border: '1px solid #1a2332',
                color: 'rgba(255, 255, 255, 0.8)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                marginBottom: '8px',
                fontFamily: 'monospace'
            }}
          >
            {showLeftPanel ? '▼ Project Atlas' : '▶ Project Atlas'}
          </button>

          {showLeftPanel && (
            <div style={{
                background: 'rgba(0,0,0,0.8)', 
                color: 'white', 
                padding: '20px', 
                borderRadius: '8px',
                fontFamily: 'monospace',
                maxWidth: '300px',
            }}>
                <div style={{marginBottom:'10px'}}>
                    <label>Label Size: {labelScale.toFixed(1)}x</label>
                    <input 
                        type="range" 
                        min="0.1" max="1" step="0.1" 
                        value={labelScale} 
                        onChange={(e) => setLabelScale(parseFloat(e.target.value))}
                        style={{width: '100%'}}
                    />
                </div>

                <div style={{marginBottom:'10px'}}>
                    <label>Ship Speed: {shipSpeed}</label>
                    <input 
                        type="range" 
                        min="5" max="50" step="1" 
                        value={shipSpeed} 
                        onChange={(e) => setShipSpeed(parseInt(e.target.value))}
                        style={{width: '100%'}}
                    />
                </div>

                <div style={{marginBottom:'10px'}}>
                    <label>Ship Size: {shipSize}</label>
                    <input 
                        type="range" 
                        min="1" max="10" step="1" 
                        value={shipSize} 
                        onChange={(e) => setShipSize(parseInt(e.target.value))}
                        style={{width: '100%'}}
                    />
                </div>

                <div style={{fontSize: '12px'}}>
                    <div>View: Globe (3D)</div>
                    <div>Land Cells: {landData.length}</div>
                    <div>Route Cells: {routeData.length}</div>
                    <div>Active Units: {ships.length}</div>
                    <hr style={{borderColor:'#444'}}/>
                    <div><span style={{color:'rgb(46, 204, 113)'}}>■</span> Land (H3 Res 3)</div>
                    <div><span style={{color:'rgb(52, 152, 219)'}}>■</span> Shipping Lanes</div>
                    <div><span style={{color:'rgb(255, 165, 0)'}}>■</span> Straits & Canals</div>
                    <div><span style={{color:'rgb(128, 0, 128)'}}>■</span> Top 50 Ports</div>
                    <div><span style={{color:'yellow'}}>●</span> Units</div>
                    {Object.values(activeCrises).some(v => v) && <div><span style={{color:'rgb(255, 0, 0)'}}>■</span> Crisis Zone</div>}
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
            style={{
                background: 'rgba(15, 22, 33, 0.9)',
                border: '1px solid #1a2332',
                color: 'rgba(255, 255, 255, 0.8)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                marginBottom: '8px',
                fontFamily: 'monospace'
            }}
          >
            {showRightPanel ? '▼ Crisis Scenarios' : '◀ Crisis Scenarios'}
          </button>
          
          {showRightPanel && (
              <div style={{
                  background: 'rgba(0,0,0,0.9)', 
                  color: 'white', 
                  padding: '15px', 
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  minWidth: '200px',
              }}>
                  <div style={{fontWeight: 'bold', fontSize: '14px', marginBottom: '10px'}}>🚨 Crisis Scenarios</div>
                  
                  {[
                    { id: 'red_sea', label: 'Red Sea Crisis', year: '2023-2024' },
                    { id: 'hormuz', label: 'Hormuz Tension', year: '2011-2012' },
                    { id: 'black_sea', label: 'Ukraine War', year: '2022-now' },
                    { id: 'covid_ports', label: 'COVID Congestion', year: '2021' },
                    { id: 'ever_given', label: 'Ever Given Suez', year: 'Mar 2021' },
                    { id: 'taiwan_strait', label: 'Taiwan Strait', year: 'Hypothetical' }
                  ].map(crisis => (
                    <div 
                      key={crisis.id}
                      onClick={() => toggleCrisis(crisis.id)}
                      style={{
                        padding: '8px 10px',
                        marginBottom: '5px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: activeCrises[crisis.id] ? 'rgba(180,0,0,0.8)' : 'rgba(60,60,60,0.8)',
                        border: activeCrises[crisis.id] ? '1px solid #ff0000' : '1px solid #444',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>{crisis.label}</span>
                      <span style={{fontSize: '10px', opacity: 0.7}}>{crisis.year}</span>
                    </div>
                  ))}
                  
                  <div style={{fontSize: '10px', marginTop: '10px', opacity: 0.5, textAlign: 'center'}}>
                    Click to toggle each scenario
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}