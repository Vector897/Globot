export interface Route {
  id: string;
  name: string;
  riskLevel: 'high' | 'medium' | 'low';
  color: string;
  strokeWidth: number;
  waypoints: [number, number][];
  waypointNames: string[]; // Names of cities/ports at each waypoint
  distance: number; // in km
  estimatedTime: number; // in hours
  description: string;
}

// Major global ports and cities for routing
export interface GlobalPort {
  name: string;
  country: string;
  coordinates: [number, number]; // [lng, lat]
  region: string;
}

const MAJOR_PORTS: GlobalPort[] = [
  // Europe
  { name: 'Rotterdam', country: 'Netherlands', coordinates: [4.47, 51.92], region: 'Europe' },
  { name: 'Hamburg', country: 'Germany', coordinates: [9.99, 53.55], region: 'Europe' },
  { name: 'Antwerp', country: 'Belgium', coordinates: [4.40, 51.22], region: 'Europe' },
  { name: 'Le Havre', country: 'France', coordinates: [0.11, 49.49], region: 'Europe' },
  { name: 'Barcelona', country: 'Spain', coordinates: [2.17, 41.38], region: 'Europe' },
  { name: 'Piraeus', country: 'Greece', coordinates: [23.65, 37.94], region: 'Europe' },
  { name: 'Istanbul', country: 'Turkey', coordinates: [28.97, 41.01], region: 'Europe' },
  { name: 'Gdansk', country: 'Poland', coordinates: [18.65, 54.35], region: 'Europe' },
  
  // Middle East
  { name: 'Dubai', country: 'UAE', coordinates: [55.27, 25.20], region: 'Middle East' },
  { name: 'Jeddah', country: 'Saudi Arabia', coordinates: [39.19, 21.54], region: 'Middle East' },
  { name: 'Port Said', country: 'Egypt', coordinates: [32.28, 31.26], region: 'Middle East' },
  { name: 'Haifa', country: 'Israel', coordinates: [34.99, 32.82], region: 'Middle East' },
  
  // Asia
  { name: 'Singapore', country: 'Singapore', coordinates: [103.85, 1.29], region: 'Asia' },
  { name: 'Hong Hong', country: 'China', coordinates: [114.17, 22.32], region: 'Asia' },
  { name: 'Shanghai', country: 'China', coordinates: [121.47, 31.23], region: 'Asia' },
  { name: 'Busan', country: 'South Korea', coordinates: [129.04, 35.18], region: 'Asia' },
  { name: 'Tokyo', country: 'Japan', coordinates: [139.77, 35.68], region: 'Asia' },
  { name: 'Mumbai', country: 'India', coordinates: [72.88, 19.08], region: 'Asia' },
  { name: 'Colombo', country: 'Sri Lanka', coordinates: [79.85, 6.93], region: 'Asia' },
  { name: 'Jakarta', country: 'Indonesia', coordinates: [106.85, -6.21], region: 'Asia' },
  
  // Africa
  { name: 'Cape Town', country: 'South Africa', coordinates: [18.42, -33.92], region: 'Africa' },
  { name: 'Durban', country: 'South Africa', coordinates: [31.03, -29.86], region: 'Africa' },
  { name: 'Lagos', country: 'Nigeria', coordinates: [3.39, 6.45], region: 'Africa' },
  { name: 'Djibouti', country: 'Djibouti', coordinates: [43.15, 11.59], region: 'Africa' },
  { name: 'Mombasa', country: 'Kenya', coordinates: [39.66, -4.05], region: 'Africa' },
  
  // Americas
  { name: 'New York', country: 'USA', coordinates: [-74.01, 40.71], region: 'Americas' },
  { name: 'Los Angeles', country: 'USA', coordinates: [-118.24, 34.05], region: 'Americas' },
  { name: 'Miami', country: 'USA', coordinates: [-80.19, 25.76], region: 'Americas' },
  { name: 'Houston', country: 'USA', coordinates: [-95.36, 29.76], region: 'Americas' },
  { name: 'Santos', country: 'Brazil', coordinates: [-46.33, -23.96], region: 'Americas' },
  { name: 'Buenos Aires', country: 'Argentina', coordinates: [-58.38, -34.60], region: 'Americas' },
  { name: 'Panama City', country: 'Panama', coordinates: [-79.53, 8.98], region: 'Americas' },
  { name: 'Vancouver', country: 'Canada', coordinates: [-123.12, 49.28], region: 'Americas' },
  
  // Oceania
  { name: 'Sydney', country: 'Australia', coordinates: [151.21, -33.87], region: 'Oceania' },
  { name: 'Melbourne', country: 'Australia', coordinates: [144.96, -37.81], region: 'Oceania' },
  { name: 'Auckland', country: 'New Zealand', coordinates: [174.76, -36.85], region: 'Oceania' },
  
  // Strategic passages
  { name: 'Suez Canal', country: 'Egypt', coordinates: [32.35, 30.44], region: 'Middle East' },
  { name: 'Strait of Malacca', country: 'Malaysia', coordinates: [100.35, 2.50], region: 'Asia' },
  { name: 'Strait of Gibraltar', country: 'Spain', coordinates: [-5.36, 36.14], region: 'Europe' },
];

// Find nearest port to a coordinate
function findNearestPort(coord: [number, number], excludePorts: GlobalPort[] = []): GlobalPort {
  let nearest = MAJOR_PORTS[0];
  let minDistance = Infinity;
  
  for (const port of MAJOR_PORTS) {
    if (excludePorts.includes(port)) continue;
    const distance = calculateDistance(coord[1], coord[0], port.coordinates[1], port.coordinates[0]);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = port;
    }
  }
  
  return nearest;
}

// Find intermediate ports for a route
function findIntermediatePorts(
  origin: [number, number],
  destination: [number, number],
  numWaypoints: number,
  preferredRegions?: string[],
  avoidPorts?: GlobalPort[]
): GlobalPort[] {
  const waypoints: GlobalPort[] = [];
  const used: GlobalPort[] = [...(avoidPorts || [])];
  
  for (let i = 1; i <= numWaypoints; i++) {
    const ratio = i / (numWaypoints + 1);
    const intermediateLng = origin[0] + (destination[0] - origin[0]) * ratio;
    const intermediateLat = origin[1] + (destination[1] - origin[1]) * ratio;
    
    // Find nearest port to this intermediate point
    let candidatePorts = MAJOR_PORTS.filter(p => !used.includes(p));
    
    // Prefer certain regions if specified
    if (preferredRegions && preferredRegions.length > 0) {
      const regionalPorts = candidatePorts.filter(p => preferredRegions.includes(p.region));
      if (regionalPorts.length > 0) {
        candidatePorts = regionalPorts;
      }
    }
    
    let nearest = candidatePorts[0];
    let minDistance = Infinity;
    
    for (const port of candidatePorts) {
      const distance = calculateDistance(intermediateLat, intermediateLng, port.coordinates[1], port.coordinates[0]);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = port;
      }
    }
    
    waypoints.push(nearest);
    used.push(nearest);
  }
  
  return waypoints;
}

export function calculateRoutes(
  origin: [number, number],
  destination: [number, number]
): Route[] {
  const [originLng, originLat] = origin;
  const [destLng, destLat] = destination;

  // Find the actual ports nearest to origin and destination
  const originPort = findNearestPort(origin);
  const destPort = findNearestPort(destination, [originPort]);

  // Calculate direct distance
  const directDistance = calculateDistance(originLat, originLng, destLat, destLng);

  const routes: Route[] = [];

  // Route 1: Safe Route - via Southern route (Africa/Indian Ocean)
  const safeIntermediates = findIntermediatePorts(
    originPort.coordinates,
    destPort.coordinates,
    3,
    ['Africa', 'Middle East', 'Asia']
  );
  
  const safeWaypoints = [
    originPort.coordinates,
    ...safeIntermediates.map(p => p.coordinates),
    destPort.coordinates
  ];
  
  const safeWaypointNames = [
    originPort.name,
    ...safeIntermediates.map(p => p.name),
    destPort.name
  ];
  
  const safeDistance = calculateTotalDistance(safeWaypoints);
  
  routes.push({
    id: 'safe-route-1',
    name: 'Southern Corridor',
    riskLevel: 'low',
    color: '#5a9a7a',
    strokeWidth: 2,
    waypoints: safeWaypoints,
    waypointNames: safeWaypointNames,
    distance: safeDistance,
    estimatedTime: Math.round(safeDistance / 35),
    description: 'Secure route via established shipping lanes',
  });

  // Route 2: Alternative Safe Route - via different intermediates
  const alt1Intermediates = findIntermediatePorts(
    originPort.coordinates,
    destPort.coordinates,
    2,
    ['Europe', 'Asia', 'Oceania'],
    safeIntermediates
  );
  
  const alt1Waypoints = [
    originPort.coordinates,
    ...alt1Intermediates.map(p => p.coordinates),
    destPort.coordinates
  ];
  
  const alt1WaypointNames = [
    originPort.name,
    ...alt1Intermediates.map(p => p.name),
    destPort.name
  ];
  
  const alt1Distance = calculateTotalDistance(alt1Waypoints);
  
  routes.push({
    id: 'safe-route-2',
    name: 'Northern Corridor',
    riskLevel: 'low',
    color: '#6ba889',
    strokeWidth: 2,
    waypoints: alt1Waypoints,
    waypointNames: alt1WaypointNames,
    distance: alt1Distance,
    estimatedTime: Math.round(alt1Distance / 35),
    description: 'Alternative secure shipping corridor',
  });

  // Route 3: Medium Risk - Moderate detour
  const medIntermediates = findIntermediatePorts(
    originPort.coordinates,
    destPort.coordinates,
    2,
    undefined,
    [...safeIntermediates, ...alt1Intermediates]
  );
  
  const medWaypoints = [
    originPort.coordinates,
    ...medIntermediates.map(p => p.coordinates),
    destPort.coordinates
  ];
  
  const medWaypointNames = [
    originPort.name,
    ...medIntermediates.map(p => p.name),
    destPort.name
  ];
  
  const medDistance = calculateTotalDistance(medWaypoints);
  
  routes.push({
    id: 'medium-risk-1',
    name: 'Express Route',
    riskLevel: 'medium',
    color: '#e8a547',
    strokeWidth: 2.5,
    waypoints: medWaypoints,
    waypointNames: medWaypointNames,
    distance: medDistance,
    estimatedTime: Math.round(medDistance / 38),
    description: 'Faster route with moderate exposure',
  });

  // Route 4: Another medium risk option
  const med2Intermediates = findIntermediatePorts(
    originPort.coordinates,
    destPort.coordinates,
    1,
    undefined,
    [...safeIntermediates, ...alt1Intermediates, ...medIntermediates]
  );
  
  const med2Waypoints = [
    originPort.coordinates,
    ...med2Intermediates.map(p => p.coordinates),
    destPort.coordinates
  ];
  
  const med2WaypointNames = [
    originPort.name,
    ...med2Intermediates.map(p => p.name),
    destPort.name
  ];
  
  const med2Distance = calculateTotalDistance(med2Waypoints);
  
  routes.push({
    id: 'medium-risk-2',
    name: 'Balanced Route',
    riskLevel: 'medium',
    color: '#d9953e',
    strokeWidth: 2.5,
    waypoints: med2Waypoints,
    waypointNames: med2WaypointNames,
    distance: med2Distance,
    estimatedTime: Math.round(med2Distance / 38),
    description: 'Time-optimized with acceptable risk',
  });

  // Return only top 4 routes (no high-risk route)
  return routes;
}

// Calculate total distance along waypoints
function calculateTotalDistance(waypoints: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lng1, lat1] = waypoints[i];
    const [lng2, lat2] = waypoints[i + 1];
    total += calculateDistance(lat1, lng1, lat2, lng2);
  }
  return total;
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}