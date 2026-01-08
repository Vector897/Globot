import { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { motion } from 'motion/react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { calculateRoutes, Route } from '../utils/routeCalculator';

interface Port {
  name: string;
  coordinates: [number, number];
}

interface GlobalMap3DProps {
  origin?: Port;
  destination?: Port;
  onRouteSelect?: (route: Route) => void;
  onRoutesCalculated?: (routes: Route[]) => void;
  selectedRouteFromParent?: Route | null;
}

export function GlobalMap3D({ origin, destination, onRouteSelect, onRoutesCalculated, selectedRouteFromParent }: GlobalMap3DProps) {
  const globeEl = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [pulseOpacity, setPulseOpacity] = useState(0.6);
  const [altitude, setAltitude] = useState(2.5);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

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

  useEffect(() => {
    if (globeEl.current && globeReady) {
      // Auto-rotate
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.3;

      // Point camera at route midpoint if both ports selected
      if (origin && destination) {
        const midLat = (origin.coordinates[1] + destination.coordinates[1]) / 2;
        const midLng = (origin.coordinates[0] + destination.coordinates[0]) / 2;
        
        globeEl.current.pointOfView(
          { lat: midLat, lng: midLng, altitude: altitude },
          1500
        );
      }
    }
  }, [globeReady, origin, destination, altitude]);

  const handleZoomIn = () => {
    const newAltitude = Math.max(altitude - 0.5, 0.5);
    setAltitude(newAltitude);
    if (globeEl.current && origin && destination) {
      const midLat = (origin.coordinates[1] + destination.coordinates[1]) / 2;
      const midLng = (origin.coordinates[0] + destination.coordinates[0]) / 2;
      globeEl.current.pointOfView({ lat: midLat, lng: midLng, altitude: newAltitude }, 500);
    }
  };

  const handleZoomOut = () => {
    const newAltitude = Math.min(altitude + 0.5, 4);
    setAltitude(newAltitude);
    if (globeEl.current && origin && destination) {
      const midLat = (origin.coordinates[1] + destination.coordinates[1]) / 2;
      const midLng = (origin.coordinates[0] + destination.coordinates[0]) / 2;
      globeEl.current.pointOfView({ lat: midLat, lng: midLng, altitude: newAltitude }, 500);
    }
  };

  const handleReset = () => {
    setAltitude(2.5);
    if (globeEl.current && origin && destination) {
      const midLat = (origin.coordinates[1] + destination.coordinates[1]) / 2;
      const midLng = (origin.coordinates[0] + destination.coordinates[0]) / 2;
      globeEl.current.pointOfView({ lat: midLat, lng: midLng, altitude: 2.5 }, 1000);
    } else if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
    }
  };

  // Convert only the selected route to arcs data for the globe
  const arcsData = selectedRoute
    ? selectedRoute.waypoints.slice(0, -1).map((waypoint, index) => {
        const nextWaypoint = selectedRoute.waypoints[index + 1];
        return {
          startLat: waypoint[1],
          startLng: waypoint[0],
          endLat: nextWaypoint[1],
          endLng: nextWaypoint[0],
          color: selectedRoute.color,
          opacity: 1,
          strokeWidth: 3,
          routeId: selectedRoute.id,
        };
      })
    : [];

  // Create waypoint markers only for the selected route
  const waypointMarkers = selectedRoute
    ? selectedRoute.waypoints.slice(1, -1).map((waypoint, index) => ({
        lat: waypoint[1],
        lng: waypoint[0],
        size: 0.15,
        color: selectedRoute.color,
        label: selectedRoute.waypointNames[index + 1],
        opacity: 0.8,
      }))
    : [];

  const markersData = [
    ...(origin
      ? [
          {
            lat: origin.coordinates[1],
            lng: origin.coordinates[0],
            size: 0.6,
            color: '#4a90e2',
            label: origin.name,
            opacity: 1,
          },
        ]
      : []),
    ...(destination
      ? [
          {
            lat: destination.coordinates[1],
            lng: destination.coordinates[0],
            size: 0.6,
            color: '#c94444',
            label: destination.name,
            opacity: 1,
          },
        ]
      : []),
    ...waypointMarkers,
  ];

  return (
    <div className="relative w-full h-full bg-[#0a0e1a] overflow-hidden">
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

      {/* Globe */}
      <div className="w-full h-full" ref={containerRef}>
        <Globe
          ref={globeEl}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          onGlobeReady={() => setGlobeReady(true)}
          // Arcs for shipping routes
          arcsData={arcsData}
          arcColor={(d: any) => d.color}
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          arcStroke={(d: any) => d.strokeWidth}
          arcAltitudeAutoScale={0.3}
          // Point markers for ports
          pointsData={markersData}
          pointAltitude={0.01}
          pointRadius={(d: any) => d.size}
          pointColor={(d: any) => d.color}
          pointLabel={(d: any) => d.label}
          pointOpacity={(d: any) => d.opacity}
          // Atmosphere
          atmosphereColor="#4a90e2"
          atmosphereAltitude={0.15}
          // Styling
          backgroundColor="rgba(10, 14, 26, 0)"
        />
      </div>

      {/* Altitude indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#0f1621]/95 border border-[#1a2332] rounded-sm backdrop-blur-sm">
        <span className="text-[10px] text-white/40 font-mono tracking-wider uppercase">
          Altitude: {altitude.toFixed(1)}x
        </span>
      </div>

      {/* 3D View indicator */}
      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-[#0f1621]/80 border border-[#1a2332] rounded-sm backdrop-blur-sm">
        <span className="text-[10px] text-white/40 font-mono tracking-wider uppercase">
          3D Globe View
        </span>
      </div>
    </div>
  );
}