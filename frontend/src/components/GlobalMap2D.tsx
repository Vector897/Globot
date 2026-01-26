import React, { useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, SolidPolygonLayer, GeoJsonLayer, TextLayer } from '@deck.gl/layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { CollisionFilterExtension } from '@deck.gl/extensions';
import { MapView } from '@deck.gl/core';
import { Route } from '../utils/routeCalculator';
import { Ship } from '../utils/shipData';

// Initial View State for 2D Map (Mercator)
const INITIAL_VIEW_STATE = {
  longitude: 121.47,
  latitude: 31.23,
  zoom: 2,
  minZoom: 0,
  maxZoom: 20,
  pitch: 0,
  bearing: 0
};

// Colors
const COLOR_LAND: [number, number, number] = [46, 204, 113];
const COLOR_ROUTE: [number, number, number, number] = [52, 152, 219, 150];
const COLOR_SEA_BASE: [number, number, number] = [20, 30, 60]; 
const COLOR_OCEAN_POLY: [number, number, number, number] = [30, 40, 80, 100];
const COLOR_BORDER: [number, number, number, number] = [255, 255, 255, 200];
const COLOR_STRAIT: [number, number, number] = [255, 165, 0];
const COLOR_PORT: [number, number, number] = [128, 0, 128];

const NUM_SHIPS = 500;

// Props Interface to match existing usage
interface GlobalMap2DProps {
  origin?: any;
  destination?: any;
  onRouteSelect?: (route: Route) => void;
  onRoutesCalculated?: (routes: Route[]) => void;
  selectedRouteFromParent?: Route | null;
  currentTime?: number;
  onShipSelect?: (ship: Ship) => void;
}

export function GlobalMap2D({
  origin,
  destination,
  onRouteSelect,
  onRoutesCalculated,
  selectedRouteFromParent,
  currentTime = 0,
  onShipSelect
}: GlobalMap2DProps) {
  const [landData, setLandData] = useState<any[]>([]);
  const [routeData, setRouteData] = useState<any[]>([]);
  const [paths, setPaths] = useState<any>({});
  const [ships, setShips] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [straitsData, setStraitsData] = useState<any[]>([]);
  const [straitLabels, setStraitLabels] = useState<any[]>([]);
  const [portsData, setPortsData] = useState<any[]>([]);
  const [portLabels, setPortLabels] = useState<any[]>([]);
  const [labelScale, setLabelScale] = useState(0.08); // Default 0.08
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
  const [shipSpeed, setShipSpeed] = useState(10); // Default 10 per request
  const [shipSize, setShipSize] = useState(2);
  
  // UI Panels State
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const requestRef = useRef<number>();
  const shipSpeedRef = useRef(shipSpeed);
  
  useEffect(() => {
    shipSpeedRef.current = shipSpeed;
  }, [shipSpeed]);

  useEffect(() => {
    // Fetch all data
    fetch('/data/land_cells.json')
      .then(resp => resp.json())
      .then(data => {
        const list = Object.keys(data).map(h => ({
          hex: h, type: data[h].t, country: data[h].c
        }));
        setLandData(list);
      });

    fetch('/data/route_cells.json')
      .then(resp => resp.json())
      .then(data => {
        const list = Object.keys(data).map(h => ({ hex: h, type: data[h].t }));
        setRouteData(list);
      });

    fetch('/data/paths.json')
      .then(resp => resp.json())
      .then(pathData => {
        setPaths(pathData);
        initShips(pathData);
      });

    fetch('/data/country_labels.json')
      .then(resp => resp.json())
      .then(data => setLabels(data));

    fetch('/data/straits_cells.json')
      .then(resp => resp.json())
      .then(data => {
        const list = Object.keys(data).map(h => ({ hex: h, name: data[h].name }));
        setStraitsData(list);
      });

    fetch('/data/strait_labels.json')
      .then(resp => resp.json())
      .then(data => setStraitLabels(data));

    fetch('/data/ports_cells.json')
      .then(resp => resp.json())
      .then(data => {
        const list = Object.keys(data).map(h => ({ hex: h, name: data[h].name }));
        setPortsData(list);
      });

    fetch('/data/port_labels.json')
      .then(resp => resp.json())
      .then(data => setPortLabels(data));

    fetch('/data/all_crisis_zones.json')
      .then(resp => resp.json())
      .then(data => setAllCrisisData(data));

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
        pathId: randomPathKey,
        path: path,
        progress: Math.random(),
        speed: 0.0005 + Math.random() * 0.001,
        reversed: Math.random() > 0.5
      });
    }
    setShips(newShips);
  };

  // Generate Graticule Data (Memoized)
  const graticuleData = React.useMemo(() => {
    const lines = [];
    // Longitude lines
    for (let lon = -180; lon <= 180; lon += 10) {
      lines.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[lon, -90], [lon, 90]] }
      });
    }
    // Latitude lines
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

  const graticuleLabels = React.useMemo(() => {
    const labels = [];
    // Longitude labels (at Equator)
    for (let lon = -180; lon <= 180; lon += 20) { // Every 20 deg for labels to avoid clutter
      if (lon === -180) continue; // Avoid overlap
      labels.push({
        text: `${Math.abs(lon)}°${lon < 0 ? 'W' : lon > 0 ? 'E' : ''}`,
        coordinates: [lon, 0]
      });
    }
    // Latitude labels (at Prime Meridian)
    for (let lat = -80; lat <= 80; lat += 20) { // Every 20 deg
      if (lat === 0) continue; 
      labels.push({
        text: `${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'}`,
        coordinates: [0, lat]
      });
    }
    return labels;
  }, []);

  useEffect(() => {
    if (ships.length === 0) return;

    const updateShips = () => {
       setShips(prevShips => {
        return prevShips.map(ship => {
          let newProgress = ship.progress + ship.speed * shipSpeedRef.current;
          let newReversed = ship.reversed;
          
          if (newProgress >= 1) newProgress = 0;

          return { ...ship, progress: newProgress };
        });
      });
    };
    
    const interval = setInterval(updateShips, 50);
    return () => clearInterval(interval);
  }, [ships.length]);

  const getShipData = () => {
    return ships.map(ship => {
      if (!ship.path || ship.path.length < 2) return null;
      
      const totalPoints = ship.path.length;
      let effectiveProgress = ship.progress;
      if (ship.reversed) effectiveProgress = 1 - ship.progress;

      const exactIndex = effectiveProgress * (totalPoints - 1);
      const index = Math.floor(exactIndex);
      const nextIndex = Math.min(index + 1, totalPoints - 1);
      const ratio = exactIndex - index;

      const p1 = ship.path[index];
      const p2 = ship.path[nextIndex];

      const lon = p1[0] + (p2[0] - p1[0]) * ratio;
      const lat = p1[1] + (p2[1] - p1[1]) * ratio;

      return { position: [lon, lat], pathId: ship.pathId };
    }).filter(s => s !== null);
  };

  const visibleLabels = labels.filter((l: any) => l.size > 1.5);

  const layers = [
    // 1. Background Sea
    new SolidPolygonLayer({
        id: 'background-sea',
        data: [{ polygon: [[-180, 90], [180, 90], [180, -90], [-180, -90]] }],
        getPolygon: (d: any) => d.polygon,
        getFillColor: COLOR_SEA_BASE,
        stroked: false,
        filled: true,
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
        getPosition: (d: any) => d.coordinates,
        getText: (d: any) => d.text,
        getSize: 10, // Fixed small size
        getColor: [255, 255, 255, 90], // Semi-transparent white
        fontFamily: 'Arial',
        fontWeight: 'normal',
        billboard: true, // Face camera in 3D (irrelevant for 2D but good practice)
        background: false
    }),

    // 2. Ocean Regions
    new GeoJsonLayer({
        id: 'ocean-layer',
        data: '/data/oceans.geojson',
        filled: true,
        stroked: true,
        getFillColor: COLOR_OCEAN_POLY,
        getLineColor: [255, 255, 255, 20],
        getLineWidth: 1,
        lineWidthMinPixels: 0,
        opacity: 0.3
    }),

    // 3. Land (Flat H3 - no extrusion for 2D)
    new H3HexagonLayer({
      id: 'land-layer',
      data: landData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: false, // FLAT for 2D
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => COLOR_LAND,
      opacity: 1
    }),
    
    // 4. Country Borders
    new GeoJsonLayer({
        id: 'border-layer',
        data: '/data/countries.geojson',
        filled: false,
        stroked: true,
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        getLineColor: COLOR_BORDER,
    }),

    // 5. Routes (Flat H3)
    new H3HexagonLayer({
      id: 'route-layer',
      data: routeData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: false, // FLAT for 2D
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => COLOR_ROUTE,
      opacity: 0.8
    }),

    // 5.5 Straits (Orange - Flat)
    new H3HexagonLayer({
      id: 'strait-layer',
      data: straitsData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: false, // FLAT for 2D
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => COLOR_STRAIT,
      opacity: 0.7
    }),

    // 5.6 Ports (Purple - Flat)
    new H3HexagonLayer({
      id: 'port-layer',
      data: portsData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: false, // FLAT for 2D
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => COLOR_PORT,
      opacity: 0.7
    }),

    // 6.5 Crisis Zone (Pulsing Red)
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
      extruded: false, // FLAT for 2D
      getHexagon: (d: any) => d.hex,
      getFillColor: (d: any) => [255, 0, 0, 255],
      opacity: 0.5 + 0.4 * Math.sin(animTime * 0.33),
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
      radiusScale: 1,
      radiusMinPixels: 2 + shipSize,
      radiusMaxPixels: 5 + shipSize * 2,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => {
        if (d.pathId) {
          for (const key of Object.keys(activeCrises)) {
            if (activeCrises[key] && allCrisisData[key]) {
              const affected = allCrisisData[key].affected_routes || [];
              const isAffected = affected.some((r: any) => d.pathId.includes(r));
              if (isAffected) return [255, 0, 0];
            }
          }
        }
        return [255, 255, 0];
      },
      getLineColor: (d: any) => [0, 0, 0],
      // @ts-ignore
      onClick: ({ object }) => {
          if (onShipSelect && object) {
              onShipSelect(object as any);
          }
      },
      updateTriggers: {
        getFillColor: [activeCrises, allCrisisData]
      }
    }),

    // 7. Country Labels
    new TextLayer({
        id: 'text-layer',
        data: visibleLabels,
        pickable: true,
        getPosition: (d: any) => [d.coordinates[0], d.coordinates[1]],
        getText: (d: any) => d.name,
        getSize: (d: any) => {
             const s = d.size || 1;
             return 12 + (s * 4) * labelScale;
        },
        sizeUnits: 'pixels',
        getColor: [255, 255, 255, 255],
        outlineWidth: 2,
        outlineColor: [0, 0, 0, 200],
        background: false,
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
        }
    }),

    // 8. Strait Labels
    new TextLayer({
      id: 'strait-label-layer',
      data: straitLabels,
      pickable: false,
      getPosition: (d: any) => d.coordinates || [d.lon, d.lat],
      getText: (d: any) => d.name,
      getSize: (d: any) => {
        // Standardize size: d.size is missing in JSON, so usage default large base
        // 200 * 0.08 (default scale) = 16px
        const baseSize = d.size ? d.size * 500 : 200; 
        return baseSize * labelScale;
      },
      getColor: [255, 0, 0, 255], // Red fill (Sync with 3D)
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 255], // Black outline
      fontFamily: 'Inter, system-ui',
      fontWeight: 'bold',
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      billboard: false,

      // Collision Handling
      extensions: [new CollisionFilterExtension()],
      collisionEnabled: true,
      getCollisionPriority: (d: any) => 10, // Medium priority
      collisionTestProps: {
          sizeScale: 4,
          sizeMaxPixels: 100,
          sizeMinPixels: 10
      }
    }),

    // 9. Port Labels
    new TextLayer({
      id: 'port-label-layer',
      data: portLabels,
      pickable: false,
      getPosition: (d: any) => d.coordinates || [d.lon, d.lat],
      getText: (d: any) => d.name,
      getSize: (d: any) => {
        // Standardize size: d.size is missing in JSON, so usage default large base
        // 180 * 0.08 (default scale) = 14.4px
        const baseSize = d.size ? d.size * 500 : 180;
        return baseSize * labelScale;
      },
      getColor: [255, 165, 0, 255], // Orange fill (Sync with 3D)
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 255], // Black outline
      fontFamily: 'Inter, system-ui',
      fontWeight: 'bold',
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      billboard: false,

      // Collision Handling
      extensions: [new CollisionFilterExtension()],
      collisionEnabled: true,
      getCollisionPriority: (d: any) => 20, // High priority for ports
      collisionTestProps: {
          sizeScale: 4,
          sizeMaxPixels: 100,
          sizeMinPixels: 10
      }
    })
  ];

  const toggleCrisis = (key: string) => {
    setActiveCrises((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#020204' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        views={new MapView({ repeat: true })}
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
            {showLeftPanel ? '▼ 2D Map Information' : '▶ 2D Map Information'}
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
                    <label>Label Size: {labelScale.toFixed(2)}</label>
                    <input 
                        type="range" 
                        min="0.05" max="0.2" step="0.01" 
                        value={labelScale} 
                        onChange={(e) => setLabelScale(parseFloat(e.target.value))}
                        style={{width: '100%'}}
                    />
                  </div>

                  <div style={{marginBottom:'10px'}}>
                    <label>Ship Speed: {shipSpeed}</label>
                    <input 
                        type="range" 
                        min="5" max="20" step="1" 
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
                      <div>View: Flat Map (2D)</div>
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
