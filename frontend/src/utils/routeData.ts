// routeData.ts

// --- SEA HIGHWAYS ---
// Highly detailed paths for major trade lanes to avoid land

// 1. ASIA -> EUROPE (via CAPE of GOOD HOPE)
// Avoiding Red Sea/Suez due to Crisis
export const PATH_ASIA_EUROPE_CAPE: [number, number][] = [
    // East China Sea
    [122.0, 31.0], [123.0, 28.0], [120.0, 23.0], 
    // South China Sea
    [115.0, 18.0], [110.0, 10.0], [105.0, 4.0], [104.0, 1.3],
    // Malacca Strait
    [100.0, 3.0], [98.0, 5.0], [95.0, 5.5],
    // Indian Ocean crossing to South Africa
    [80.0, -5.0], [70.0, -15.0], [60.0, -20.0], [50.0, -25.0], 
    [40.0, -30.0], [35.0, -32.0], [30.0, -33.0], [25.0, -34.5],
    // Cape of Good Hope
    [20.0, -35.5], [18.5, -35.0], [15.0, -32.0], 
    // Atlantic Ocean Northbound
    [10.0, -20.0], [0.0, -10.0], [-10.0, 0.0], [-18.0, 10.0], 
    [-20.0, 20.0], [-15.0, 30.0], [-12.0, 40.0], [-8.0, 45.0],
    // English Channel
    [-5.0, 48.5], [0.0, 50.0], [2.0, 51.0], [4.0, 52.0]
];

// 2. ASIA -> EUROPE (via SUEZ) - High Risk
export const PATH_ASIA_EUROPE_SUEZ: [number, number][] = [
    [122.0, 31.0], [120.0, 23.0], 
    [110.0, 10.0], [104.0, 1.3], 
    [95.0, 6.0], [80.0, 6.0], [65.0, 10.0], 
    [55.0, 12.0], [50.0, 13.0], [45.0, 12.5], // Gulf of Aden
    [43.0, 12.5], [41.0, 15.0], // Red Sea Start
    [38.0, 19.0], [36.0, 23.0], [34.0, 27.0], [32.5, 29.9], // Suez
    [31.0, 31.5], [25.0, 33.5], [15.0, 36.0], [0.0, 37.0], // Med
    [-5.5, 36.0], // Gibraltar
    [-9.0, 38.0], [-6.0, 45.0], [0.0, 50.0], [4.0, 52.0]
];

// 3. ASIA -> US WEST COAST (Pacific Great Circle)
export const PATH_ASIA_USWC: [number, number][] = [
    [122.0, 31.0], [130.0, 33.0], [140.0, 35.0],
    [150.0, 38.0], [160.0, 41.0], [170.0, 43.0], 
    [180.0, 44.0], [-170.0, 44.0], [-160.0, 43.0],
    [-150.0, 41.0], [-140.0, 38.0], [-130.0, 35.0],
    [-125.0, 33.0], [-120.0, 32.0]
];

// 4. ASIA -> US EAST COAST (via Panama)
export const PATH_ASIA_USEC_PANAMA: [number, number][] = [
    [122.0, 31.0], [135.0, 25.0], [150.0, 20.0],
    [180.0, 15.0], [-160.0, 12.0], [-130.0, 10.0],
    [-100.0, 8.0], [-85.0, 7.0], 
    [-80.0, 9.0], // Panama
    [-75.0, 15.0], [-72.0, 20.0], [-70.0, 25.0],
    [-72.0, 30.0], [-74.0, 35.0], [-73.0, 39.0]
];

// 5. EUROPE -> US EAST COAST (Trans-Atlantic)
export const PATH_EUROPE_USEC: [number, number][] = [
    [4.0, 52.0], [0.0, 50.0], [-6.0, 49.0],
    [-20.0, 47.0], [-30.0, 45.0], [-40.0, 43.0],
    [-50.0, 41.0], [-60.0, 40.5], [-70.0, 40.0],
    [-73.0, 40.5]
];

// 5.b. ASIA -> EUROPE (Northern Sea Route) - High Risk/Seasonal
export const PATH_ASIA_EUROPE_ARCTIC: [number, number][] = [
    [122.0, 31.0], [130.0, 35.0], [140.0, 40.0], [142.0, 50.0],
    [150.0, 55.0], [160.0, 60.0], [170.0, 66.0], // Bering Strait approach
    [180.0, 68.0], [-170.0, 70.0], // Chukchi Sea
    [160.0, 72.0], [140.0, 74.0], [120.0, 75.0], // Laptev
    [100.0, 76.0], [80.0, 75.0], [60.0, 74.0],   // Kara Sea
    [40.0, 72.0], [30.0, 71.0], [20.0, 71.0],    // Barents Sea
    [10.0, 70.0], [5.0, 65.0], [3.0, 60.0],
    [4.0, 52.0] // Rotterdam
];

// 5.c. ASIA -> USWC (Southern Route / Hawaii)
export const PATH_ASIA_USWC_SOUTH: [number, number][] = [
    [122.0, 31.0], [130.0, 25.0], [140.0, 22.0],
    [150.0, 20.0], [160.0, 20.0], [170.0, 20.0],
    [-170.0, 20.0], [-160.0, 21.0], [-158.0, 21.3], // Hawaii
    [-150.0, 25.0], [-140.0, 28.0], [-130.0, 30.0],
    [-120.0, 32.0]
];

// 6. INTRA-ASIA (Shanghai -> Singapore)
// 6. INTRA-ASIA (Shanghai -> Singapore)
export const PATH_INTRA_ASIA: [number, number][] = [
    [122.0, 31.0], [123.0, 28.0], [121.0, 24.0],
    [118.0, 21.0], [112.0, 15.0], [109.0, 10.0],
    [105.0, 5.0], [104.0, 1.3]
];

// 7. ASIA -> MEDITERRANEAN (via Suez) - Ends at Suez Exit for flexible routing
export const PATH_ASIA_MED_SUEZ: [number, number][] = [
    [122.0, 31.0], [120.0, 23.0], 
    [110.0, 10.0], [104.0, 1.3], 
    [95.0, 6.0], [80.0, 6.0], [65.0, 10.0], 
    [55.0, 12.0], [50.0, 13.0], [45.0, 12.5], // Gulf of Aden
    [43.0, 12.5], [41.0, 15.0], // Red Sea
    [38.0, 19.0], [36.0, 23.0], [34.0, 27.0], [32.5, 29.9], // Suez
    [32.0, 31.3]  // Port Said (Suez Exit) - Route ends here, system connects to destination
];

// 8. ASIA -> MEDITERRANEAN (via Cape)
export const PATH_ASIA_MED_CAPE: [number, number][] = [
    [122.0, 31.0], [123.0, 28.0], [120.0, 23.0], 
    [115.0, 18.0], [110.0, 10.0], [105.0, 4.0], [104.0, 1.3],
    [100.0, 3.0], [98.0, 5.0], [95.0, 5.5],
    [80.0, -5.0], [70.0, -15.0], [60.0, -20.0], [50.0, -25.0], 
    [40.0, -30.0], [35.0, -32.0], [30.0, -33.0], [25.0, -34.5],
    [20.0, -35.5], [18.5, -35.0], [15.0, -32.0], 
    [10.0, -20.0], [0.0, -10.0], [-10.0, 0.0], [-18.0, 10.0], 
    [-15.0, 30.0], [-10.0, 34.0], [-6.0, 35.8] // Into Med via Gibraltar
];

// --- NEW "SPINE" SYSTEM FOR MODULAR ROUTING ---

// 1. MEDITERRANEAN SPINE (Gibraltar <-> Suez)
// Central highway through the Med, avoiding islands/land
export const PATH_SPINE_MED: [number, number][] = [
    [-5.5, 36.0], // Gibraltar Start
    [-4.0, 36.2], // Alboran Sea
    [0.0, 37.0],  // Off Algeria
    [8.0, 38.0],  // North of Tunisia, South of Sardinia
    [12.0, 37.5], // Sicily Channel
    [15.0, 36.5], // South of Sicily
    [20.0, 35.5], // Ionian Sea
    [26.0, 34.0], // South of Crete
    [30.0, 33.0], // SE Med
    [32.0, 31.5]  // Port Said (Suez Entrance)
];

// 2. NORTH ATLANTIC SPINE (English Channel <-> Gibraltar)
// Hugs the European coast safely
export const PATH_SPINE_NORTH_ATLANTIC: [number, number][] = [
    [2.5, 51.5],  // Southern North Sea
    [0.0, 50.0],  // English Channel
    [-5.0, 48.5], // Ushant (France Tip)
    [-8.0, 45.0], // Bay of Biscay Deep
    [-10.0, 42.0], // Off Portugal North
    [-10.0, 37.0], // Cape St Vincent
    [-7.0, 36.0], // Gulf of Cadiz
    [-5.5, 36.0]  // Gibraltar Connection
];

// 3. ASIA SPINE (Shanghai <-> Singapore)
export const PATH_SPINE_ASIA: [number, number][] = [
    [122.0, 31.0], // Shanghai
    [123.0, 29.0], // East China Sea
    [120.5, 24.0], // Taiwan Strait
    [118.0, 21.0], // South China Sea North
    [112.0, 15.0], // Paracel Area
    [109.0, 10.0], // Spratly Area
    [105.0, 5.0],  // Off Vietnam
    [104.2, 1.4]   // Singapore East
];

// 4. TRANS-ATLANTIC SPINE (Gibraltar <-> US East Coast/Panama)
export const PATH_SPINE_TRANS_ATLANTIC: [number, number][] = [
    [-6.0, 35.8], // Gibraltar
    [-20.0, 30.0], // Mid Atlantic
    [-45.0, 25.0], // Central Atlantic
    [-70.0, 25.0]  // Approach Carribean/East Coast
];