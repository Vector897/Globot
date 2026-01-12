import { 
  PATH_ASIA_EUROPE_CAPE, 
  PATH_ASIA_EUROPE_SUEZ, 
  PATH_ASIA_EUROPE_ARCTIC,
  PATH_ASIA_USWC, 
  PATH_ASIA_USWC_SOUTH,
  PATH_ASIA_USEC_PANAMA,
  PATH_EUROPE_USEC,
  PATH_INTRA_ASIA,
  PATH_ASIA_MED_SUEZ,
  PATH_ASIA_MED_CAPE
} from './routeData';
import { MAJOR_PORTS } from '../data/ports';

// Interfaces
export interface GlobalPort {
  name: string;
  coordinates: [number, number];
  country: string;
  region: string;
}

export interface Route {
  id: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high';
  color: string;
  strokeWidth: number;
  waypoints: [number, number][];
  waypointNames: string[];
  distance: number;
  estimatedTime: number;
  description: string;
}

export function calculateRoutes(origin: [number, number], destination: [number, number]): Route[] {
  console.log('[RouteCalculator] Input Coordinates:', origin, destination);
  const originPort = findNearestPort(origin);
  const destPort = findNearestPort(destination, new Set([originPort.name]));
  console.log('[RouteCalculator] Nearest Ports:', originPort?.name, destPort?.name, originPort?.region, destPort?.region);

  if (!originPort || !destPort) {
      console.warn('[RouteCalculator] Could not identify ports.');
      return calculateDynamicRoutes(originPort || { coordinates: origin, name: 'Origin', region: 'Unknown' } as any, destPort || { coordinates: destination, name: 'Dest', region: 'Unknown' } as any);
  }
  
  // Helper to check regions
  const isAsia = (p: GlobalPort) => {
      const res = p.region === 'Asia' || p.region === 'Middle East';
      // console.log(`isAsia(${p.name}):`, res, p.region);
      return res;
  };
  const isEurope = (p: GlobalPort) => {
      const res = p.region === 'Europe';
      // console.log(`isEurope(${p.name}):`, res, p.region);
      return res;
  };
  const isUSWest = (p: GlobalPort) => p.region === 'Americas' && p.coordinates[0] < -100; // Rough check
  const isUSEast = (p: GlobalPort) => p.region === 'Americas' && p.coordinates[0] > -100;

  // 1. ASIA <-> EUROPE
  if ((isAsia(originPort) && isEurope(destPort)) || (isEurope(originPort) && isAsia(destPort))) {
    return [
      {
        id: "route-cape",
        name: "Cape of Good Hope",
        riskLevel: "low",
        color: "#2ecc71",
        strokeWidth: 3,
        waypoints: adjustDirection(PATH_ASIA_EUROPE_CAPE, originPort, destPort),
        waypointNames: [originPort.name, "Singapore", "Cape Town", destPort.name],
        distance: 13500, // Approx nm
        estimatedTime: 13500 / 18 / 24, // Days @ 18kts
        description: "Primary secure route via Africa"
      },
      {
        id: "route-suez",
        name: "Suez Canal / Red Sea",
        riskLevel: "high",
        color: "#e74c3c",
        strokeWidth: 3,
        waypoints: adjustDirection(PATH_ASIA_EUROPE_SUEZ, originPort, destPort),
        waypointNames: [originPort.name, "Singapore", "Suez", destPort.name],
        distance: 10500,
        estimatedTime: 10500 / 18 / 24,
        description: "High risk transit zone"
      },
      {
        id: "route-arctic",
        name: "Northern Sea Route",
        riskLevel: "high",
        color: "#9b59b6",
        strokeWidth: 2,
        waypoints: adjustDirection(PATH_ASIA_EUROPE_ARCTIC, originPort, destPort),
        waypointNames: [originPort.name, "Bering Strait", "Arctic", destPort.name],
        distance: 8000,
        estimatedTime: 8000 / 14 / 24, // Slower speed in ice
        description: "Arctic route (Seasonal/Ice)"
      }
    ];
  }

  // 2. ASIA <-> US WEST COAST
  if ((isAsia(originPort) && isUSWest(destPort)) || (isUSWest(originPort) && isAsia(destPort))) {
    return [
      {
        id: "route-pacific",
        name: "Pacific Great Circle",
        riskLevel: "low",
        color: "#3498db",
        strokeWidth: 3,
        waypoints: adjustDirection(PATH_ASIA_USWC, originPort, destPort),
        waypointNames: [originPort.name, "Pacific", destPort.name],
        distance: 6000,
        estimatedTime: 14,
        description: "Direct trans-pacific route"
      },
      {
        id: "route-pacific-south",
        name: "Pacific Southern Route",
        riskLevel: "low",
        color: "#f1c40f",
        strokeWidth: 2,
        waypoints: adjustDirection(PATH_ASIA_USWC_SOUTH, originPort, destPort),
        waypointNames: [originPort.name, "Hawaii", destPort.name],
        distance: 7200,
        estimatedTime: 17,
        description: "Avoids northern storms"
      },
      {
         id: "route-pacific-direct",
         name: "Direct Line (Theoretical)",
         riskLevel: "medium",
         color: "#95a5a6",
         strokeWidth: 1,
         waypoints: [originPort.coordinates, destPort.coordinates],
         waypointNames: [originPort.name, "Ocean", destPort.name],
         distance: 5800,
         estimatedTime: 13,
         description: "Shortest geometric path"
      }
    ];
  }

  // 3. ASIA <-> US EAST COAST
  if ((isAsia(originPort) && isUSEast(destPort)) || (isUSEast(originPort) && isAsia(destPort))) {
    return [{
      id: "route-panama",
      name: "Panama Canal",
      riskLevel: "medium",
      color: "#f1c40f",
      strokeWidth: 2,
      waypoints: adjustDirection(PATH_ASIA_USEC_PANAMA, originPort, destPort),
      waypointNames: [originPort.name, "Panama", destPort.name],
      distance: 10000,
      estimatedTime: 23,
      description: "Via Panama Canal"
    }];
  }
  
  // 4. EUROPE <-> US EAST COAST
  if ((isEurope(originPort) && isUSEast(destPort)) || (isUSEast(originPort) && isEurope(destPort))) {
    return [{
      id: "route-transatlantic",
      name: "Trans-Atlantic",
      riskLevel: "low",
      color: "#3498db",
      strokeWidth: 2,
      waypoints: adjustDirection(PATH_EUROPE_USEC, originPort, destPort),
      waypointNames: [originPort.name, "Atlantic", destPort.name],
      distance: 3500,
      estimatedTime: 8,
      description: "Direct Atlantic crossing"
    }];
  }

  // 5. INTRA-ASIA (Fallback/Specific)
  if (isAsia(originPort) && isAsia(destPort)) {
     // Use dynamic for short distance but try to map to predefined if close
     return calculateDynamicRoutes(originPort, destPort);
  }

  // 6. ASIA <-> MEDITERRANEAN (e.g. Tanger Med, Barcelona) -> Special Handling
  // because "Europe" check might be strict or we want specific Med paths
  const isMed = (p: GlobalPort) => p.region === 'Africa' || p.region === 'Europe'; 
  if ((isAsia(originPort) && isMed(destPort)) || (isMed(originPort) && isAsia(destPort))) {
      // Prioritize these over generic Europe for Mediterranean ports
      if (['Tanger Med', 'Barcelona', 'Valencia', 'Algeciras', 'Genoa', 'Piraeus', 'Port Said'].includes(originPort.name) || 
          ['Tanger Med', 'Barcelona', 'Valencia', 'Algeciras', 'Genoa', 'Piraeus', 'Port Said'].includes(destPort.name)) {
          
            return [
                {
                    id: "route-med-cape",
                    name: "Cape of Good Hope (Med)",
                    riskLevel: "low",
                    color: "#2ecc71",
                    strokeWidth: 3,
                    waypoints: adjustDirection(PATH_ASIA_MED_CAPE, originPort, destPort),
                    waypointNames: [originPort.name, "Cape Town", destPort.name],
                    distance: 14000,
                    estimatedTime: 32,
                    description: "Secure route to Mediterranean"
                },
                {
                    id: "route-med-suez",
                    name: "Suez Canal (Med)",
                    riskLevel: "high",
                    color: "#e74c3c",
                    strokeWidth: 3,
                    waypoints: adjustDirection(PATH_ASIA_MED_SUEZ, originPort, destPort),
                    waypointNames: [originPort.name, "Suez", destPort.name],
                    distance: 9000,
                    estimatedTime: 20,
                    description: "Direct Med access via Suez"
                }
            ];
      }
  }

  // Fallback to Dynamic
  return calculateDynamicRoutes(originPort, destPort);
}

// --- HELPERS ---

// Reverses path if going West->East vs East->West relative to definitions
function adjustDirection(path: [number, number][], origin: GlobalPort, dest: GlobalPort): [number, number][] {
   // Simple heuristic: If path defined A->B, and we want B->A, reverse it.
   // We'll compare distance of origin to path[0] vs path[last]
   const dStart = calculateDistance(origin.coordinates[1], origin.coordinates[0], path[0][1], path[0][0]);
   const dEnd = calculateDistance(origin.coordinates[1], origin.coordinates[0], path[path.length-1][1], path[path.length-1][0]);
   
   let finalPath = [...path];
   if (dEnd < dStart) {
     finalPath = finalPath.reverse();
   }
   
   // Stitch exact ports to ends
   return [origin.coordinates, ...finalPath, dest.coordinates];
}

function findNearestPort(coord: [number, number], excludeNames: Set<string> = new Set()): GlobalPort {
  let nearest = MAJOR_PORTS[0];
  let minDistance = Infinity;
  for (const port of MAJOR_PORTS) {
    if (excludeNames.has(port.name)) continue;
    const dist = calculateDistance(coord[1], coord[0], port.coordinates[1], port.coordinates[0]);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = port;
    }
  }
  return nearest;
}

function calculateDynamicRoutes(originPort: GlobalPort, destPort: GlobalPort): Route[] {
  // Simple Great Circle fallback for undefined routes
  const waypoints: [number, number][] = [originPort.coordinates, destPort.coordinates];
  const dist = calculateTotalDistance(waypoints);
  return [{
    id: "dyn-direct",
    name: "Direct Route",
    riskLevel: "medium",
    color: "#95a5a6",
    strokeWidth: 1,
    waypoints: waypoints,
    waypointNames: [originPort.name, destPort.name],
    distance: dist,
    estimatedTime: Math.round(dist / 300), // very rough
    description: "Direct calculated path"
  }];
}

function calculateTotalDistance(waypoints: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lng1, lat1] = waypoints[i];
    const [lng2, lat2] = waypoints[i + 1];
    total += calculateDistance(lat1, lng1, lat2, lng2);
  }
  return Math.round(total);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(d: number): number {
  return d * Math.PI / 180;
}
