import React from 'react';
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, ArcLayer, TextLayer, GeoJsonLayer } from "@deck.gl/layers";
import "../styles/globe.css";

interface Port {
  name: string;
  lng: number;
  lat: number;
  type: "origin" | "destination" | "alternative";
}

interface Route {
  from: [number, number];
  to: [number, number];
  vessel: string;
  status: "normal" | "at_risk" | "rerouted";
}

interface Globe3DProps {
  ports: Port[];
  routes: Route[];
}

export const Globe3D: React.FC<Globe3DProps> = ({ ports, routes }) => {
  const [flash, setFlash] = React.useState(true);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFlash(prev => !prev);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const layers = [
    // 0. Country Borders (Background)
    new GeoJsonLayer({
      id: 'base-map',
      data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson',
      stroked: true,
      filled: false, // Wireframe only for Aviation style
      lineWidthMinPixels: 1,
      getLineColor: [0, 80, 179, 100], // Faint Blue lines
      getFillColor: [255, 255, 255, 0]
    }),

    // 1. Port Markers
    new ScatterplotLayer({
      id: "ports",
      data: ports,
      getPosition: (d: Port) => [d.lng, d.lat],
      getRadius: 50000,
      getFillColor: (d: Port) => d.type === "origin" ? [0, 120, 212] : [0, 178, 148],
      pickable: true,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
    }),

    // 2. Port Labels (New)
    new TextLayer({
        id: 'port-labels',
        data: ports,
        getPosition: (d: Port) => [d.lng, d.lat],
        getText: (d: Port) => d.name,
        getSize: 16,
        getColor: [0, 58, 140], // Dark Blue text
        getPixelOffset: [0, -20],
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif'
    }),

    // 3. Routes (Arcs on top)
    new ArcLayer({
      id: "routes",
      data: routes,
      getSourcePosition: (d: Route) => d.from,
      getTargetPosition: (d: Route) => d.to,
      getSourceColor: (d: Route) => {
          if (d.status === "at_risk") return [255, 0, 0, flash ? 255 : 50]; 
          return [0, 50, 200, 100]; 
      },
      getTargetColor: (d: Route) => {
          if (d.status === "at_risk") return [255, 0, 0, flash ? 255 : 50]; 
          return [0, 50, 200, 100]; 
      },
      getWidth: (d: Route) => d.status === "at_risk" ? 4 : 1.5, 
      getHeight: (d: Route) => d.status === "at_risk" ? 0.8 : 0.3, // Higher arc
      updateTriggers: {
        getSourceColor: [flash],
        getTargetColor: [flash]
      }
    }),
  ];

  return (
    <div className="globe-container" style={{
        background: 'linear-gradient(to bottom, #e0f7fa 0%, #ffffff 100%)', 
        border: '2px solid #0050b3',
        boxShadow: '0 0 20px rgba(0, 80, 179, 0.3)',
        color: '#003a8c'
    }}>
      <DeckGL
        layers={layers}
        initialViewState={{
          longitude: 120, // Focus on Asia-Pacific for Shanghai to LA route visualization
          latitude: 20,
          zoom: 1.5,
          pitch: 0,
          bearing: 0,
        }}
        controller={true}
        style={{ position: 'relative', background: 'transparent' }} 
      />
      <div className="globe-overlay" style={{ color: '#003a8c', textShadow: 'none' }}>
         <h4 style={{borderBottom: '1px solid #003a8c'}}>Aviation Logistics Map</h4>
         <p>Active Routes: {routes.length}</p>
      </div>
    </div>
  );
};

// Enhanced Mock Data for Visual Complexity
const MAJOR_PORTS: Port[] = [
  { name: "Shanghai", lng: 121.47, lat: 31.23, type: "origin" },
  { name: "Los Angeles", lng: -118.24, lat: 34.05, type: "destination" },
  { name: "Rotterdam", lng: 4.47, lat: 51.92, type: "alternative" },
  { name: "Singapore", lng: 103.81, lat: 1.35, type: "origin" },
  { name: "New York", lng: -74.00, lat: 40.71, type: "destination" },
  { name: "Dubai", lng: 55.27, lat: 25.20, type: "alternative" },
  { name: "Busan", lng: 129.07, lat: 35.17, type: "origin" },
  { name: "Hamburg", lng: 9.99, lat: 53.54, type: "destination" },
  { name: "Tokyo", lng: 139.69, lat: 35.68, type: "origin" },
  { name: "Sydney", lng: 151.20, lat: -33.86, type: "destination" },
];

// Generate 50+ background routes for "busy" look
const generateBackgroundRoutes = (): Route[] => {
  const routes: Route[] = [];
  const ports = MAJOR_PORTS;
  for (let i = 0; i < 50; i++) {
    const from = ports[Math.floor(Math.random() * ports.length)];
    const to = ports[Math.floor(Math.random() * ports.length)];
    if (from.name !== to.name) {
      routes.push({
        from: [from.lng, from.lat],
        to: [to.lng, to.lat],
        vessel: `Vessel-${i}`,
        status: "normal"
      });
    }
  }
  return routes;
};

export const DEMO_PORTS = MAJOR_PORTS;
export const DEMO_ROUTES = [
  ...generateBackgroundRoutes(),
  // The Critical Route (Red)
  {
    from: [121.47, 31.23],
    to: [-118.24, 34.05],
    vessel: "MSC Aries (Target)",
    status: "at_risk",
  } as Route
];
