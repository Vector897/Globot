// routeData.ts

// ==========================================
// MARITIME GRAPH SYSTEM
// ==========================================
// A graph-based representation of major sea lanes for dynamic pathfinding.
// Nodes represent key waypoints (ports, straits, turning points).
// Edges represent navigable segments.

export interface SeaNode {
    id: string;
    coordinates: [number, number]; // [lon, lat]
    name: string;
}

export interface SeaEdge {
    from: string;
    to: string;
    distance: number; // approximate nm
    risk: number; // 1.0 = normal, >1.0 = high risk
    geometry?: [number, number][]; // Optional: Detailed path for this segment to avoid land
}

// --- 1. NODES ---
export const MARITIME_NODES: Record<string, SeaNode> = {
    // Asia
    'shanghai': { id: 'shanghai', coordinates: [122.0, 31.0], name: 'Shanghai' },
    'taiwan_strait': { id: 'taiwan_strait', coordinates: [119.5, 24.5], name: 'Taiwan Strait' },
    'south_china_sea_n': { id: 'south_china_sea_n', coordinates: [115.0, 18.0], name: 'SCS North' },
    'south_china_sea_s': { id: 'south_china_sea_s', coordinates: [109.0, 10.0], name: 'SCS South' },
    'singapore': { id: 'singapore', coordinates: [103.8, 1.3], name: 'Singapore' },
    
    // Indian Ocean
    'malacca_exit': { id: 'malacca_exit', coordinates: [95.0, 5.5], name: 'Malacca West' },
    'sri_lanka_s': { id: 'sri_lanka_s', coordinates: [80.6, 5.8], name: 'Dondra Head' },
    'arabian_sea_mid': { id: 'arabian_sea_mid', coordinates: [65.0, 10.0], name: 'Arabian Sea Mid' },
    'horn_africa': { id: 'horn_africa', coordinates: [51.5, 12.0], name: 'Horn of Africa' },
    'mauritius_n': { id: 'mauritius_n', coordinates: [57.5, -15.0], name: 'Mauritius North' },
    'madagascar_s': { id: 'madagascar_s', coordinates: [45.0, -26.0], name: 'Madagascar South' },
    'durban_off': { id: 'durban_off', coordinates: [32.0, -30.0], name: 'Durban Offshore' },
    'cape_good_hope': { id: 'cape_good_hope', coordinates: [18.5, -35.5], name: 'Cape of Good Hope' },
    
    // Red Sea / Suez
    'bab_el_mandeb': { id: 'bab_el_mandeb', coordinates: [43.5, 12.5], name: 'Bab el-Mandeb' },
    'red_sea_s': { id: 'red_sea_s', coordinates: [41.0, 16.0], name: 'Red Sea South' },
    'jeddah_off': { id: 'jeddah_off', coordinates: [38.5, 21.5], name: 'Jeddah Offshore' },
    'suez_s': { id: 'suez_s', coordinates: [32.5, 29.9], name: 'Suez South' },
    'suez_n': { id: 'suez_n', coordinates: [32.3, 31.3], name: 'Suez North (Port Said)' },
    
    // Mediterranean
    'crete_s': { id: 'crete_s', coordinates: [25.0, 34.0], name: 'Crete South' },
    'sicily_s': { id: 'sicily_s', coordinates: [14.0, 36.0], name: 'Sicily South' },
    'gibraltar_e': { id: 'gibraltar_e', coordinates: [-4.0, 36.0], name: 'Gibraltar East' },
    'gibraltar_w': { id: 'gibraltar_w', coordinates: [-6.5, 35.8], name: 'Gibraltar West' },
    
    // Atlantic (East/Europe)
    'lisbon_off': { id: 'lisbon_off', coordinates: [-10.0, 38.0], name: 'Lisbon Offshore' },
    'biscay_off': { id: 'biscay_off', coordinates: [-8.0, 45.0], name: 'Biscay Offshore' },
    'english_channel_w': { id: 'english_channel_w', coordinates: [-5.0, 49.0], name: 'English Channel West' },
    'english_channel_e': { id: 'english_channel_e', coordinates: [1.5, 51.0], name: 'English Channel East' },
    'rotterdam': { id: 'rotterdam', coordinates: [4.0, 52.0], name: 'Rotterdam' },
    'canary_islands': { id: 'canary_islands', coordinates: [-16.0, 28.0], name: 'Canary Islands' },
    'cape_verde': { id: 'cape_verde', coordinates: [-25.0, 16.0], name: 'Cape Verde' },
    'equator_atl_e': { id: 'equator_atl_e', coordinates: [-15.0, 0.0], name: 'Equator Atlantic East' },
    'equator_atl_w': { id: 'equator_atl_w', coordinates: [-30.0, 0.0], name: 'Equator Atlantic West' },

    // Americas / Pacific
    'panama_e': { id: 'panama_e', coordinates: [-79.9, 9.4], name: 'Panama East (Caribbean)' },
    'panama_w': { id: 'panama_w', coordinates: [-79.5, 8.9], name: 'Panama West (Pacific)' },
    'los_angeles': { id: 'los_angeles', coordinates: [-118.2, 33.7], name: 'Los Angeles' },
    'hawaii_s': { id: 'hawaii_s', coordinates: [-156.0, 19.0], name: 'Hawaii South' },
    'pacific_mid_n': { id: 'pacific_mid_n', coordinates: [180.0, 40.0], name: 'Pacific Mid North' },
    'pacific_mid_s': { id: 'pacific_mid_s', coordinates: [180.0, 20.0], name: 'Pacific Mid South' },
    'yokohama_off': { id: 'yokohama_off', coordinates: [140.0, 34.5], name: 'Yokohama Offshore' },

    // US East Coast
    'new_york': { id: 'new_york', coordinates: [-73.5, 40.0], name: 'New York' },
    'charleston_off': { id: 'charleston_off', coordinates: [-78.0, 32.0], name: 'Charleston Offshore' },
    'florida_strait': { id: 'florida_strait', coordinates: [-79.5, 25.0], name: 'Florida Strait' },

    // South America
    'santos': { id: 'santos', coordinates: [-46.3, -24.0], name: 'Santos' },
    'buenos_aires': { id: 'buenos_aires', coordinates: [-58.4, -34.6], name: 'Buenos Aires' },
    'cape_horn': { id: 'cape_horn', coordinates: [-67.0, -56.0], name: 'Cape Horn' },
    'valparaiso': { id: 'valparaiso', coordinates: [-71.6, -33.0], name: 'Valparaiso' },
    'recife_off': { id: 'recife_off', coordinates: [-34.0, -8.0], name: 'Recife Offshore' },

    // Oceania
    'sydney': { id: 'sydney', coordinates: [151.2, -33.8], name: 'Sydney' },
    'torres_strait': { id: 'torres_strait', coordinates: [142.0, -10.5], name: 'Torres Strait' },
    'fremantle': { id: 'fremantle', coordinates: [115.7, -32.0], name: 'Fremantle' },
    'tasman_sea': { id: 'tasman_sea', coordinates: [160.0, -40.0], name: 'Tasman Sea' }
};

// --- 2. EDGES (Connections) ---
// Define the graph connections. Double-sided connections are handled by the algorithm, 
// but we define canonical segments here.
export const MARITIME_EDGES: SeaEdge[] = [
    // Asia Spine (Curved to follow coast)
    { from: 'shanghai', to: 'taiwan_strait', distance: 450, risk: 1, geometry: [[122.0, 31.0], [123.0, 28.0], [121.0, 26.0], [119.5, 24.5]] },
    { from: 'taiwan_strait', to: 'south_china_sea_n', distance: 500, risk: 1, geometry: [[119.5, 24.5], [118.0, 22.0], [116.0, 20.0], [115.0, 18.0]] },
    { from: 'south_china_sea_n', to: 'south_china_sea_s', distance: 600, risk: 1, geometry: [[115.0, 18.0], [112.0, 14.0], [110.0, 11.0], [109.0, 10.0]] },
    { from: 'south_china_sea_s', to: 'singapore', distance: 500, risk: 1, geometry: [[109.0, 10.0], [106.0, 6.0], [104.5, 3.0], [104.0, 1.5], [103.8, 1.3]] },

    // Indian Ocean
    { from: 'singapore', to: 'malacca_exit', distance: 600, risk: 1, geometry: [[103.8, 1.3], [101.5, 2.5], [99.0, 4.0], [95.0, 5.5]] },
    { from: 'malacca_exit', to: 'sri_lanka_s', distance: 900, risk: 1, geometry: [[95.0, 5.5], [90.0, 6.0], [85.0, 6.0], [80.6, 5.8]] },
    
    // Route A: Suez
    { from: 'sri_lanka_s', to: 'arabian_sea_mid', distance: 1100, risk: 1, geometry: [[80.6, 5.8], [75.0, 8.0], [70.0, 9.0], [65.0, 10.0]] },
    { from: 'arabian_sea_mid', to: 'horn_africa', distance: 900, risk: 2, geometry: [[65.0, 10.0], [60.0, 11.5], [55.0, 12.5], [51.5, 12.0]] }, 
    { from: 'horn_africa', to: 'bab_el_mandeb', distance: 450, risk: 3, geometry: [[51.5, 12.0], [48.0, 12.5], [45.0, 12.5], [43.5, 12.5]] },
    { from: 'bab_el_mandeb', to: 'red_sea_s', distance: 200, risk: 2, geometry: [[43.5, 12.5], [42.5, 13.5], [41.0, 16.0]] },
    { from: 'red_sea_s', to: 'jeddah_off', distance: 400, risk: 1.5, geometry: [[41.0, 16.0], [40.0, 18.0], [39.0, 20.0], [38.5, 21.5]] },
    { from: 'jeddah_off', to: 'suez_s', distance: 600, risk: 1, geometry: [[38.5, 21.5], [37.0, 24.0], [35.0, 27.0], [33.5, 29.0], [32.5, 29.9]] },
    { from: 'suez_s', to: 'suez_n', distance: 100, risk: 1, geometry: [[32.5, 29.9], [32.4, 30.6], [32.3, 31.3]] }, // Canal Transit
    
    // Route B: Cape (Avoid Africa land mass)
    { from: 'sri_lanka_s', to: 'mauritius_n', distance: 1800, risk: 1, geometry: [[80.6, 5.8], [75.0, 0.0], [65.0, -10.0], [57.5, -15.0]] },
    { from: 'malacca_exit', to: 'mauritius_n', distance: 2400, risk: 1, geometry: [[95.0, 5.5], [85.0, -5.0], [70.0, -12.0], [57.5, -15.0]] },
    { from: 'mauritius_n', to: 'madagascar_s', distance: 900, risk: 1, geometry: [[57.5, -15.0], [52.0, -20.0], [48.0, -25.0], [45.0, -26.0]] },
    { from: 'madagascar_s', to: 'durban_off', distance: 800, risk: 1, geometry: [[45.0, -26.0], [40.0, -29.0], [35.0, -31.0], [32.0, -30.0]] },
    { from: 'durban_off', to: 'cape_good_hope', distance: 850, risk: 1.2, geometry: [[32.0, -30.0], [28.0, -33.0], [24.0, -34.5], [20.0, -35.5], [18.5, -35.5]] },
    { from: 'cape_good_hope', to: 'equator_atl_e', distance: 2400, risk: 1, geometry: [[18.5, -35.5], [15.0, -30.0], [10.0, -20.0], [5.0, -10.0], [0.0, -5.0], [-15.0, 0.0]] },
    { from: 'equator_atl_e', to: 'canary_islands', distance: 1700, risk: 1, geometry: [[-15.0, 0.0], [-20.0, 10.0], [-22.0, 20.0], [-16.0, 28.0]] },
    { from: 'canary_islands', to: 'lisbon_off', distance: 700, risk: 1, geometry: [[-16.0, 28.0], [-14.0, 33.0], [-12.0, 36.0], [-10.0, 38.0]] },
    
    // Mediterranean (Detailed to avoid islands/peninsulas)
    { from: 'suez_n', to: 'crete_s', distance: 450, risk: 1, geometry: [[32.3, 31.3], [30.0, 32.5], [28.0, 33.5], [25.0, 34.0]] },
    { from: 'crete_s', to: 'sicily_s', distance: 500, risk: 1, geometry: [[25.0, 34.0], [20.0, 35.0], [16.0, 35.5], [14.0, 36.0]] },
    { from: 'sicily_s', to: 'gibraltar_e', distance: 900, risk: 1, geometry: [[14.0, 36.0], [10.0, 37.5], [5.0, 37.5], [0.0, 37.0], [-4.0, 36.0]] },
    { from: 'gibraltar_e', to: 'gibraltar_w', distance: 50, risk: 1, geometry: [[-4.0, 36.0], [-5.0, 36.0], [-5.5, 35.9], [-6.5, 35.8]] },
    
    // Europe Atlantic
    { from: 'gibraltar_w', to: 'lisbon_off', distance: 300, risk: 1, geometry: [[-6.5, 35.8], [-8.0, 36.5], [-9.5, 37.5], [-10.0, 38.0]] },
    { from: 'lisbon_off', to: 'biscay_off', distance: 450, risk: 1, geometry: [[-10.0, 38.0], [-10.0, 42.0], [-9.0, 44.0], [-8.0, 45.0]] },
    { from: 'biscay_off', to: 'english_channel_w', distance: 300, risk: 1, geometry: [[-8.0, 45.0], [-6.0, 47.0], [-5.0, 49.0]] },
    { from: 'english_channel_w', to: 'english_channel_e', distance: 250, risk: 1, geometry: [[-5.0, 49.0], [-2.0, 50.0], [0.0, 50.5], [1.5, 51.0]] },
    { from: 'english_channel_e', to: 'rotterdam', distance: 150, risk: 1, geometry: [[1.5, 51.0], [2.5, 51.5], [3.5, 51.8], [4.0, 52.0]] },

    // Trans-Pacific
    { from: 'shanghai', to: 'yokohama_off', distance: 950, risk: 1, geometry: [[122.0, 31.0], [128.0, 32.0], [135.0, 33.0], [140.0, 34.5]] },
    { from: 'yokohama_off', to: 'pacific_mid_n', distance: 2100, risk: 1.1, geometry: [[140.0, 34.5], [150.0, 37.0], [160.0, 39.0], [170.0, 40.0], [180.0, 40.0]] },
    { from: 'pacific_mid_n', to: 'los_angeles', distance: 2600, risk: 1, geometry: [[180.0, 40.0], [-160.0, 38.0], [-140.0, 36.0], [-125.0, 34.0], [-118.2, 33.7]] },
    
    { from: 'yokohama_off', to: 'hawaii_s', distance: 3400, risk: 1, geometry: [[140.0, 34.5], [160.0, 30.0], [180.0, 25.0], [-170.0, 22.0], [-156.0, 19.0]] },
    { from: 'hawaii_s', to: 'los_angeles', distance: 2200, risk: 1, geometry: [[-156.0, 19.0], [-140.0, 25.0], [-130.0, 30.0], [-118.2, 33.7]] },
    
    // Trans-Atlantic
    { from: 'english_channel_w', to: 'new_york', distance: 3000, risk: 1.1, geometry: [[-5.0, 49.0], [-20.0, 47.0], [-40.0, 44.0], [-60.0, 41.0], [-73.5, 40.0]] },
    { from: 'gibraltar_w', to: 'new_york', distance: 3200, risk: 1, geometry: [[-6.5, 35.8], [-20.0, 35.0], [-40.0, 38.0], [-60.0, 39.0], [-73.5, 40.0]] },
    
    // Panama
    { from: 'los_angeles', to: 'panama_w', distance: 2900, risk: 1, geometry: [[-118.2, 33.7], [-115.0, 30.0], [-110.0, 20.0], [-100.0, 12.0], [-90.0, 10.0], [-79.5, 8.9]] },
    { from: 'panama_w', to: 'panama_e', distance: 50, risk: 1, geometry: [[-79.5, 8.9], [-79.7, 9.1], [-79.9, 9.4]] }, 
    { from: 'panama_e', to: 'florida_strait', distance: 1000, risk: 1, geometry: [[-79.9, 9.4], [-78.0, 15.0], [-76.0, 20.0], [-79.5, 25.0]] },
    { from: 'florida_strait', to: 'charleston_off', distance: 400, risk: 1, geometry: [[-79.5, 25.0], [-79.0, 28.0], [-78.0, 32.0]] },
    { from: 'charleston_off', to: 'new_york', distance: 550, risk: 1, geometry: [[-78.0, 32.0], [-75.0, 36.0], [-73.5, 40.0]] },
    { from: 'panama_e', to: 'new_york', distance: 1900, risk: 1, geometry: [[-79.9, 9.4], [-75.0, 15.0], [-70.0, 25.0], [-70.0, 35.0], [-73.5, 40.0]] },
    
    // Cross-links for robustness
    { from: 'singapore', to: 'shanghai', distance: 2100, risk: 1, geometry: [[103.8, 1.3], [105.0, 5.0], [109.0, 10.0], [112.0, 15.0], [118.0, 21.0], [121.0, 26.0], [122.0, 31.0]] },

    // South America East Coast
    { from: 'equator_atl_w', to: 'recife_off', distance: 600, risk: 1, geometry: [[-30.0, 0.0], [-32.0, -4.0], [-34.0, -8.0]] },
    { from: 'recife_off', to: 'santos', distance: 1100, risk: 1, geometry: [[-34.0, -8.0], [-38.0, -15.0], [-42.0, -20.0], [-46.3, -24.0]] },
    { from: 'santos', to: 'buenos_aires', distance: 1000, risk: 1, geometry: [[-46.3, -24.0], [-50.0, -30.0], [-55.0, -34.0], [-58.4, -34.6]] },
    { from: 'buenos_aires', to: 'cape_horn', distance: 1300, risk: 1.2, geometry: [[-58.4, -34.6], [-60.0, -45.0], [-65.0, -55.0], [-67.0, -56.0]] },

    // South America West Coast
    { from: 'panama_w', to: 'valparaiso', distance: 2600, risk: 1, geometry: [[-79.5, 8.9], [-81.0, 0.0], [-80.0, -10.0], [-75.0, -20.0], [-71.6, -33.0]] },
    { from: 'valparaiso', to: 'cape_horn', distance: 1400, risk: 1.2, geometry: [[-71.6, -33.0], [-75.0, -45.0], [-75.0, -52.0], [-67.0, -56.0]] },

    // Oceania
    { from: 'south_china_sea_s', to: 'torres_strait', distance: 1800, risk: 1, geometry: [[109.0, 10.0], [115.0, 0.0], [125.0, -5.0], [135.0, -8.0], [142.0, -10.5]] },
    { from: 'torres_strait', to: 'sydney', distance: 1500, risk: 1, geometry: [[142.0, -10.5], [145.0, -15.0], [150.0, -25.0], [151.2, -33.8]] },
    { from: 'sydney', to: 'tasman_sea', distance: 600, risk: 1, geometry: [[151.2, -33.8], [155.0, -38.0], [160.0, -40.0]] },
    { from: 'malacca_exit', to: 'fremantle', distance: 2200, risk: 1, geometry: [[95.0, 5.5], [100.0, 0.0], [105.0, -10.0], [110.0, -20.0], [115.7, -32.0]] },
    { from: 'fremantle', to: 'tasman_sea', distance: 2000, risk: 1, geometry: [[115.7, -32.0], [125.0, -38.0], [140.0, -42.0], [160.0, -40.0]] },
    
    // Trans-Pacific South
    { from: 'tasman_sea', to: 'pacific_mid_s', distance: 3000, risk: 1, geometry: [[160.0, -40.0], [170.0, -20.0], [180.0, 0.0], [180.0, 20.0]] },
    { from: 'valparaiso', to: 'pacific_mid_s', distance: 4500, risk: 1, geometry: [[-71.6, -33.0], [-100.0, -20.0], [-140.0, -10.0], [-180.0, 20.0]] },

    // Atlantic South Cross
    { from: 'cape_good_hope', to: 'santos', distance: 3300, risk: 1, geometry: [[18.5, -35.5], [0.0, -30.0], [-20.0, -28.0], [-40.0, -25.0], [-46.3, -24.0]] }
];

// --- 3. EXISTING STATIC PATHS (Kept for fallback/legacy) ---
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

export const PATH_ASIA_USWC: [number, number][] = [
    [122.0, 31.0], [130.0, 33.0], [140.0, 35.0],
    [150.0, 38.0], [160.0, 41.0], [170.0, 43.0], 
    [180.0, 44.0], [-170.0, 44.0], [-160.0, 43.0],
    [-150.0, 41.0], [-140.0, 38.0], [-130.0, 35.0],
    [-125.0, 33.0], [-120.0, 32.0]
];

export const PATH_ASIA_USEC_PANAMA: [number, number][] = [
    [122.0, 31.0], [135.0, 25.0], [150.0, 20.0],
    [180.0, 15.0], [-160.0, 12.0], [-130.0, 10.0],
    [-100.0, 8.0], [-85.0, 7.0], 
    [-80.0, 9.0], // Panama
    [-75.0, 15.0], [-72.0, 20.0], [-70.0, 25.0],
    [-72.0, 30.0], [-74.0, 35.0], [-73.0, 39.0]
];

export const PATH_EUROPE_USEC: [number, number][] = [
    [4.0, 52.0], [0.0, 50.0], [-6.0, 49.0],
    [-20.0, 47.0], [-30.0, 45.0], [-40.0, 43.0],
    [-50.0, 41.0], [-60.0, 40.5], [-70.0, 40.0],
    [-73.0, 40.5]
];

export const PATH_ASIA_EUROPE_ARCTIC: [number, number][] = [
    [122.0, 31.0], [130.0, 35.0], [140.0, 40.0], [142.0, 50.0],
    [150.0, 55.0], [160.0, 60.0], [170.0, 66.0],
    [180.0, 68.0], [-170.0, 70.0],
    [160.0, 72.0], [140.0, 74.0], [120.0, 75.0],
    [100.0, 76.0], [80.0, 75.0], [60.0, 74.0],
    [40.0, 72.0], [30.0, 71.0], [20.0, 71.0],
    [10.0, 70.0], [5.0, 65.0], [3.0, 60.0],
    [4.0, 52.0]
];

export const PATH_ASIA_USWC_SOUTH: [number, number][] = [
    [122.0, 31.0], [130.0, 25.0], [140.0, 22.0],
    [150.0, 20.0], [160.0, 20.0], [170.0, 20.0],
    [-170.0, 20.0], [-160.0, 21.0], [-158.0, 21.3],
    [-150.0, 25.0], [-140.0, 28.0], [-130.0, 30.0],
    [-120.0, 32.0]
];

export const PATH_INTRA_ASIA: [number, number][] = [
    [122.0, 31.0], [123.0, 28.0], [121.0, 24.0],
    [118.0, 21.0], [112.0, 15.0], [109.0, 10.0],
    [105.0, 5.0], [104.0, 1.3]
];

export const PATH_ASIA_MED_SUEZ: [number, number][] = [
    [122.0, 31.0], [120.0, 23.0], 
    [110.0, 10.0], [104.0, 1.3], 
    [95.0, 6.0], [80.0, 6.0], [65.0, 10.0], 
    [55.0, 12.0], [50.0, 13.0], [45.0, 12.5],
    [43.0, 12.5], [41.0, 15.0],
    [38.0, 19.0], [36.0, 23.0], [34.0, 27.0], [32.5, 29.9],
    [32.0, 31.3]
];

export const PATH_ASIA_MED_CAPE: [number, number][] = [
    [122.0, 31.0], [123.0, 28.0], [120.0, 23.0], 
    [115.0, 18.0], [110.0, 10.0], [105.0, 4.0], [104.0, 1.3],
    [100.0, 3.0], [98.0, 5.0], [95.0, 5.5],
    [80.0, -5.0], [70.0, -15.0], [60.0, -20.0], [50.0, -25.0], 
    [40.0, -30.0], [35.0, -32.0], [30.0, -33.0], [25.0, -34.5],
    [20.0, -35.5], [18.5, -35.0], [15.0, -32.0], 
    [10.0, -20.0], [0.0, -10.0], [-10.0, 0.0], [-18.0, 10.0], 
    [-15.0, 30.0], [-10.0, 34.0], [-6.0, 35.8]
];

export const PATH_SPINE_MED: [number, number][] = [
    [-5.5, 36.0], [-4.0, 36.2], [0.0, 37.0], [8.0, 38.0], 
    [12.0, 37.5], [15.0, 36.5], [20.0, 35.5], [26.0, 34.0], 
    [30.0, 33.0], [32.0, 31.5]
];

export const PATH_SPINE_NORTH_ATLANTIC: [number, number][] = [
    [2.5, 51.5], [0.0, 50.0], [-5.0, 48.5], [-8.0, 45.0], 
    [10.0, 42.0], [-10.0, 37.0], [-7.0, 36.0], [-5.5, 36.0]
];

export const PATH_SPINE_ASIA: [number, number][] = [
    [122.0, 31.0], [123.0, 29.0], [120.5, 24.0], [118.0, 21.0], 
    [112.0, 15.0], [109.0, 10.0], [105.0, 5.0], [104.2, 1.4]
];

export const PATH_SPINE_TRANS_ATLANTIC: [number, number][] = [
    [-6.0, 35.8], [-20.0, 30.0], [-45.0, 25.0], [-70.0, 25.0]
];
