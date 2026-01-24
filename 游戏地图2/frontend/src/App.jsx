import React, { useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, SolidPolygonLayer, GeoJsonLayer, TextLayer } from '@deck.gl/layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { _GlobeView as GlobeView } from '@deck.gl/core';

// Initial View State for Globe
const INITIAL_VIEW_STATE = {
  longitude: 121.47,
  latitude: 31.23,
  zoom: 1.5,
  minZoom: 0,
  maxZoom: 20
};

// Colors
const COLOR_LAND = [46, 204, 113];
const COLOR_ROUTE = [52, 152, 219, 150];
const COLOR_SEA_BASE = [20, 30, 60]; 
const COLOR_OCEAN_POLY = [30, 40, 80, 100]; // Semi-transparent for marine regions
const COLOR_BORDER = [255, 255, 255, 200];
const COLOR_LABEL = [0, 0, 0, 200];
const COLOR_STRAIT = [255, 165, 0]; // Orange for Straits/Canals
const COLOR_PORT = [128, 0, 128]; // Purple for Ports
const COLOR_CRISIS = [255, 0, 0]; // Red for Crisis Zone

const NUM_SHIPS = 500;

function App() {
  const [landData, setLandData] = useState([]);
  const [routeData, setRouteData] = useState([]);
  const [paths, setPaths] = useState({});
  const [ships, setShips] = useState([]);
  const [labels, setLabels] = useState([]);
  const [straitsData, setStraitsData] = useState([]);
  const [straitLabels, setStraitLabels] = useState([]);
  const [portsData, setPortsData] = useState([]);
  const [portLabels, setPortLabels] = useState([]);
  const [labelScale, setLabelScale] = useState(0.4);
  const [allCrisisData, setAllCrisisData] = useState({});
  const [activeCrises, setActiveCrises] = useState({
    red_sea: false,
    hormuz: false,
    black_sea: false,
    covid_ports: false,
    ever_given: false,
    taiwan_strait: false
  });
  const [animTime, setAnimTime] = useState(0);
  const [shipSpeed, setShipSpeed] = useState(2); // 1-10 scale
  const [shipSize, setShipSize] = useState(2); // 1-10 scale
  
  
  // Animation Frame
  const requestRef = useRef();
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
      requestAnimationFrame(animLoop);
    };
    const animId = requestAnimationFrame(animLoop);
      
    return () => {
      cancelAnimationFrame(requestRef.current);
      cancelAnimationFrame(animId);
    };
  }, []);

  const initShips = (pathData) => {
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
    animate();
  };

  const animate = () => {
    setShips(prevShips => {
      return prevShips.map(ship => {
        let newProgress = ship.progress + ship.speed * (shipSpeedRef.current / 2); // Use ref for current speed
        if (newProgress >= 1) newProgress = 0; // Loop
        return { ...ship, progress: newProgress };
      });
    });
    requestRef.current = requestAnimationFrame(animate);
  };

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
  const visibleLabels = labels.filter(l => l.size > 1.5);

  const layers = [
    // 1. Base Sphere (Darkest Blue)
    new SolidPolygonLayer({
        id: 'background-sea',
        data: [{ polygon: [[-180, 90], [180, 90], [180, -90], [-180, -90]] }],
        getPolygon: d => d.polygon,
        getFillColor: COLOR_SEA_BASE,
        stroked: false,
        filled: true,
        material: false 
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
        opacity: 0.3
    }),

    // 3. Land (Extruded H3)
    new H3HexagonLayer({
      id: 'land-layer',
      data: landData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: true,
      getHexagon: d => d.hex,
      getFillColor: d => COLOR_LAND,
      getElevation: d => d.country === 'ATA' ? 50000 : 20000, 
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
      getHexagon: d => d.hex,
      getFillColor: d => COLOR_ROUTE,
      getElevation: d => 1000, 
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
      getHexagon: d => d.hex,
      getFillColor: d => COLOR_STRAIT,
      getElevation: d => 25000, // Above land extrusion (20km)
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
      getHexagon: d => d.hex,
      getFillColor: d => COLOR_PORT,
      getElevation: d => 25000, // Above land extrusion (20km)
      elevationScale: 1,
      opacity: 0.5 // Semi-transparent to show ships
    }),

    // 6.5 Crisis Zone (Pulsing Red - renders all active scenarios)
    new H3HexagonLayer({
      id: 'crisis-layer',
      data: (() => {
        // Collect cells from all active crises
        const cells = [];
        Object.keys(activeCrises).forEach(key => {
          if (activeCrises[key] && allCrisisData[key] && allCrisisData[key].cells) {
            allCrisisData[key].cells.forEach(cell => cells.push({ hex: cell, scenario: key }));
          }
        });
        console.log('Crisis cells count:', cells.length); // Debug
        return cells;
      })(),
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: true,
      getHexagon: d => d.hex,
      getFillColor: d => [255, 0, 0, 255],
      getElevation: d => 40000, // Higher than other layers
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
      getPosition: d => d.position,
      getFillColor: d => {
        // Check if any active crisis affects this ship's route
        if (d.pathId) {
          for (const key of Object.keys(activeCrises)) {
            if (activeCrises[key] && allCrisisData[key]) {
              const affected = allCrisisData[key].affected_routes || [];
              const isAffected = affected.some(r => d.pathId.includes(r));
              if (isAffected) return [255, 0, 0]; // Red
            }
          }
        }
        return [255, 255, 0]; // Normal yellow
      },
      getLineColor: d => [0, 0, 0],
      updateTriggers: {
        getFillColor: [activeCrises, allCrisisData]
      }
    }),

    // 7. Labels
    new TextLayer({
        id: 'text-layer',
        data: visibleLabels,
        pickable: true,
        getPosition: d => [d.coordinates[0], d.coordinates[1], 100000], // Higher elevation to prevent occlusion
        getText: d => d.name,
        
        // Dynamic scaling (Meters)
        getSize: d => {
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
        
        parameters: {
            depthTest: true
        }
    }),

    // 8. Strait/Canal Labels (Orange text with dark outline)
    new TextLayer({
        id: 'strait-text-layer',
        data: straitLabels,
        pickable: true,
        getPosition: d => [d.coordinates[0], d.coordinates[1], 80000],
        getText: d => d.name,
        
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
        
        parameters: {
            depthTest: true
        }
    }),

    // 9. Port Labels (Red bold text)
    new TextLayer({
        id: 'port-text-layer',
        data: portLabels,
        pickable: true,
        getPosition: d => [d.coordinates[0], d.coordinates[1], 70000],
        getText: d => d.name,
        
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
        
        parameters: {
            depthTest: true
        }
    })
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#020204' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        views={new GlobeView()}
        getTooltip={({object}) => {
             if (!object) return null;
             if (object.hex) return `Cell: ${object.hex}\nCountry: ${object.country || 'N/A'}`;
             if (object.name) return `Country: ${object.name}`; // Label
             if (object.properties?.NAME) return `Region: ${object.properties.NAME}`; // Marine
             return null;
        }}
      />
      
      {/* UI Overlay */}
      <div style={{
          position: 'absolute', 
          top: 20, 
          left: 20, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          pointerEvents: 'none',
          fontFamily: 'monospace',
          maxWidth: '300px'
      }}>
          <h2 style={{marginTop:0}}>Project Atlas</h2>
          
          <div style={{marginBottom:'10px', pointerEvents: 'auto'}}>
            <label>Label Size: {labelScale.toFixed(1)}x</label>
            <input 
                type="range" 
                min="0.1" max="1" step="0.1" 
                value={labelScale} 
                onChange={(e) => setLabelScale(parseFloat(e.target.value))}
                style={{width: '100%'}}
            />
          </div>

          <div style={{marginBottom:'10px', pointerEvents: 'auto'}}>
            <label>Ship Speed: {shipSpeed}</label>
            <input 
                type="range" 
                min="1" max="10" step="1" 
                value={shipSpeed} 
                onChange={(e) => setShipSpeed(parseInt(e.target.value))}
                style={{width: '100%'}}
            />
          </div>

          <div style={{marginBottom:'10px', pointerEvents: 'auto'}}>
            <label>Ship Size: {shipSize}</label>
            <input 
                type="range" 
                min="1" max="10" step="1" 
                value={shipSize} 
                onChange={(e) => setShipSize(parseInt(e.target.value))}
                style={{width: '100%'}}
            />
          </div>

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
      
      {/* Right-side Crisis Scenarios Panel */}
      <div style={{
          position: 'absolute', 
          top: 20, 
          right: 20, 
          background: 'rgba(0,0,0,0.9)', 
          color: 'white', 
          padding: '15px', 
          borderRadius: '8px',
          fontFamily: 'monospace',
          minWidth: '200px'
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
              onClick={() => setActiveCrises(prev => ({...prev, [crisis.id]: !prev[crisis.id]}))}
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
    </div>
  );
}

export default App;
