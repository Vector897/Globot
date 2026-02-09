export interface Ship {
  id: string;
  name: string;
  type: 'Container' | 'Tanker' | 'Bulk' | 'LNG';
  status: 'Underway' | 'Moored' | 'At Risk' | 'Diverting';
  speed: number; // knots
  heading: number; // degrees (will be calculated dynamically)
  fuelLevel: number; // %
  cargo: string;
  routeId: string; // Links to active route
  origin: string;
  destination: string;
  eta: string;
  riskFactor: string;
  position?: [number, number]; // [Longitude, Latitude]

  // Simulation parameters
  progress: number; // 0-1 (Starting position on path)
  direction: 1 | -1; // 1 = forward, -1 = backward
}

export const MOCK_SHIPS: Ship[] = [
  {
    id: 'ship-1',
    name: 'EVER ALOT',
    type: 'Container',
    status: 'Underway',
    speed: 18.5,
    heading: 0,
    fuelLevel: 82,
    cargo: '24,000 TEU Electronics',
    routeId: 'route-cape', // Matches Cape Route ID
    origin: 'Shanghai',
    destination: 'Rotterdam',
    eta: '14 Days',
    riskFactor: 'Low',
    progress: 0.1,
    direction: 1
  },
  {
    id: 'ship-2',
    name: 'MSC IRIS',
    type: 'Container',
    status: 'At Risk',
    speed: 21.0,
    heading: 0,
    fuelLevel: 45,
    cargo: '18,000 TEU Textiles',
    routeId: 'route-suez', // Matches Suez Route ID
    origin: 'Shanghai',
    destination: 'Rotterdam',
    eta: '10 Days',
    riskFactor: 'High (Red Sea)',
    progress: 0.25,
    direction: 1
  },
  {
    id: 'ship-3',
    name: 'COSCO GALAXY',
    type: 'Container',
    status: 'Underway',
    speed: 19.2,
    heading: 0,
    fuelLevel: 68,
    cargo: '21,000 TEU Auto Parts',
    routeId: 'route-pacific', // Matches Pacific Route ID
    origin: 'Shanghai',
    destination: 'Los Angeles',
    eta: '5 Days',
    riskFactor: 'Low',
    progress: 0.4,
    direction: 1
  },
  {
    id: 'ship-4',
    name: 'MAERSK MC-KINNEY',
    type: 'Container',
    status: 'Diverting',
    speed: 16.5,
    heading: 0,
    fuelLevel: 30,
    cargo: '19,000 TEU Mixed Goods',
    routeId: 'fixed-suez', // Matches generated route ID
    origin: 'Singapore',
    destination: 'Hamburg',
    eta: 'Delayed (+4d)',
    riskFactor: 'Severe',
    progress: 0.6,
    direction: 1
  }
];
