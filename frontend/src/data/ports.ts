export interface GlobalPort {
  name: string;
  country: string;
  coordinates: [number, number]; // [lon, lat]
  region: string;
}

// 130+ ports from 地点.md, sorted alphabetically A-Z by name
export const MAJOR_PORTS: GlobalPort[] = [
  // A
  { name: 'Abidjan', country: 'Ivory Coast', coordinates: [-4.01, 5.31], region: 'Africa' },
  { name: 'Abu Dhabi', country: 'UAE', coordinates: [54.43, 24.52], region: 'Middle East' },
  { name: 'Adelaide', country: 'Australia', coordinates: [138.60, -34.85], region: 'Oceania' },
  { name: 'Alexandria', country: 'Egypt', coordinates: [29.92, 31.20], region: 'Mediterranean' },
  { name: 'Algeciras', country: 'Spain', coordinates: [-5.45, 36.13], region: 'Europe' },
  { name: 'Antwerp', country: 'Belgium', coordinates: [4.40, 51.22], region: 'Europe' },
  { name: 'Auckland', country: 'New Zealand', coordinates: [174.76, -36.84], region: 'Oceania' },
  
  // B
  { name: 'Baltimore', country: 'USA', coordinates: [-76.61, 39.29], region: 'Americas' },
  { name: 'Bandar Abbas', country: 'Iran', coordinates: [56.28, 27.19], region: 'Middle East' },
  { name: 'Barcelona', country: 'Spain', coordinates: [2.17, 41.35], region: 'Europe' },
  { name: 'Boston', country: 'USA', coordinates: [-71.06, 42.36], region: 'Americas' },
  { name: 'Brisbane', country: 'Australia', coordinates: [153.03, -27.47], region: 'Oceania' },
  { name: 'Buenos Aires', country: 'Argentina', coordinates: [-58.38, -34.60], region: 'Americas' },
  { name: 'Busan', country: 'South Korea', coordinates: [129.04, 35.10], region: 'Asia' },
  
  // C
  { name: 'Callao', country: 'Peru', coordinates: [-77.14, -12.04], region: 'Americas' },
  { name: 'Cape Town', country: 'South Africa', coordinates: [18.42, -33.92], region: 'Africa' },
  { name: 'Cartagena', country: 'Colombia', coordinates: [-75.51, 10.40], region: 'Americas' },
  { name: 'Casablanca', country: 'Morocco', coordinates: [-7.62, 33.59], region: 'Africa' },
  { name: 'Charleston', country: 'USA', coordinates: [-79.93, 32.78], region: 'Americas' },
  { name: 'Chennai', country: 'India', coordinates: [80.29, 13.08], region: 'Asia' },
  { name: 'Chittagong', country: 'Bangladesh', coordinates: [91.80, 22.33], region: 'Asia' },
  { name: 'Colombo', country: 'Sri Lanka', coordinates: [79.86, 6.92], region: 'Asia' },
  { name: 'Colon', country: 'Panama', coordinates: [-79.90, 9.35], region: 'Americas' },
  { name: 'Constanta', country: 'Romania', coordinates: [28.66, 44.18], region: 'Europe' },
  { name: 'Copenhagen', country: 'Denmark', coordinates: [12.57, 55.68], region: 'Europe' },
  
  // D
  { name: 'Dakar', country: 'Senegal', coordinates: [-17.44, 14.69], region: 'Africa' },
  { name: 'Dalian', country: 'China', coordinates: [121.60, 38.91], region: 'Asia' },
  { name: 'Dar es Salaam', country: 'Tanzania', coordinates: [39.29, -6.82], region: 'Africa' },
  { name: 'Djibouti', country: 'Djibouti', coordinates: [43.15, 11.59], region: 'Africa' },
  { name: 'Dubai', country: 'UAE', coordinates: [55.27, 25.20], region: 'Middle East' },
  { name: 'Dublin', country: 'Ireland', coordinates: [-6.23, 53.35], region: 'Europe' },
  { name: 'Durban', country: 'South Africa', coordinates: [31.02, -29.85], region: 'Africa' },
  
  // F
  { name: 'Felixstowe', country: 'UK', coordinates: [1.34, 51.96], region: 'Europe' },
  { name: 'Fortaleza', country: 'Brazil', coordinates: [-38.52, -3.72], region: 'Americas' },
  { name: 'Freeport', country: 'Bahamas', coordinates: [-78.70, 26.53], region: 'Americas' },
  { name: 'Fremantle', country: 'Australia', coordinates: [115.75, -32.06], region: 'Oceania' },
  
  // G
  { name: 'Gdansk', country: 'Poland', coordinates: [18.66, 54.35], region: 'Europe' },
  { name: 'Genoa', country: 'Italy', coordinates: [8.93, 44.41], region: 'Europe' },
  { name: 'Gioia Tauro', country: 'Italy', coordinates: [15.90, 38.42], region: 'Europe' },
  { name: 'Gothenburg', country: 'Sweden', coordinates: [11.97, 57.71], region: 'Europe' },
  { name: 'Guangzhou', country: 'China', coordinates: [113.34, 23.10], region: 'Asia' },
  { name: 'Guayaquil', country: 'Ecuador', coordinates: [-79.88, -2.19], region: 'Americas' },
  
  // H
  { name: 'Hai Phong', country: 'Vietnam', coordinates: [106.68, 20.86], region: 'Asia' },
  { name: 'Haifa', country: 'Israel', coordinates: [35.00, 32.82], region: 'Mediterranean' },
  { name: 'Halifax', country: 'Canada', coordinates: [-63.57, 44.64], region: 'Americas' },
  { name: 'Hamburg', country: 'Germany', coordinates: [9.99, 53.55], region: 'Europe' },
  { name: 'Helsinki', country: 'Finland', coordinates: [24.94, 60.17], region: 'Europe' },
  { name: 'Ho Chi Minh', country: 'Vietnam', coordinates: [106.62, 10.82], region: 'Asia' },
  { name: 'Hong Kong', country: 'China', coordinates: [114.16, 22.31], region: 'Asia' },
  { name: 'Houston', country: 'USA', coordinates: [-95.36, 29.76], region: 'Americas' },
  
  // I
  { name: 'Istanbul', country: 'Turkey', coordinates: [28.98, 41.01], region: 'Mediterranean' },
  { name: 'Itajai', country: 'Brazil', coordinates: [-48.66, -26.91], region: 'Americas' },
  
  // J
  { name: 'Jacksonville', country: 'USA', coordinates: [-81.66, 30.33], region: 'Americas' },
  { name: 'Jakarta', country: 'Indonesia', coordinates: [106.88, -6.11], region: 'Asia' },
  { name: 'Jawaharlal Nehru', country: 'India', coordinates: [72.95, 18.95], region: 'Asia' },
  { name: 'Jebel Ali', country: 'UAE', coordinates: [55.06, 25.01], region: 'Middle East' },
  { name: 'Jeddah', country: 'Saudi Arabia', coordinates: [39.17, 21.54], region: 'Middle East' },
  
  // K
  { name: 'Kaohsiung', country: 'Taiwan', coordinates: [120.28, 22.62], region: 'Asia' },
  { name: 'Karachi', country: 'Pakistan', coordinates: [67.01, 24.85], region: 'Asia' },
  { name: 'Kingston', country: 'Jamaica', coordinates: [-76.79, 17.97], region: 'Americas' },
  { name: 'Kobe', country: 'Japan', coordinates: [135.19, 34.69], region: 'Asia' },
  { name: 'Kuwait', country: 'Kuwait', coordinates: [47.92, 29.34], region: 'Middle East' },
  
  // L
  { name: 'Laem Chabang', country: 'Thailand', coordinates: [100.88, 13.08], region: 'Asia' },
  { name: 'Lagos', country: 'Nigeria', coordinates: [3.39, 6.45], region: 'Africa' },
  { name: 'Lazaro Cardenas', country: 'Mexico', coordinates: [-102.18, 17.96], region: 'Americas' },
  { name: 'Le Havre', country: 'France', coordinates: [0.10, 49.49], region: 'Europe' },
  { name: 'London Gateway', country: 'UK', coordinates: [0.45, 51.45], region: 'Europe' },
  { name: 'Long Beach', country: 'USA', coordinates: [-118.19, 33.75], region: 'Americas' },
  { name: 'Los Angeles', country: 'USA', coordinates: [-118.27, 33.74], region: 'Americas' },
  
  // M
  { name: 'Malta', country: 'Malta', coordinates: [14.52, 35.90], region: 'Mediterranean' },
  { name: 'Manaus', country: 'Brazil', coordinates: [-60.02, -3.10], region: 'Americas' },
  { name: 'Manila', country: 'Philippines', coordinates: [120.98, 14.59], region: 'Asia' },
  { name: 'Manzanillo MX', country: 'Mexico', coordinates: [-104.32, 19.05], region: 'Americas' },
  { name: 'Marseille', country: 'France', coordinates: [5.37, 43.30], region: 'Europe' },
  { name: 'Melbourne', country: 'Australia', coordinates: [144.96, -37.81], region: 'Oceania' },
  { name: 'Mersin', country: 'Turkey', coordinates: [34.63, 36.80], region: 'Mediterranean' },
  { name: 'Miami', country: 'USA', coordinates: [-80.19, 25.76], region: 'Americas' },
  { name: 'Mombasa', country: 'Kenya', coordinates: [39.66, -4.04], region: 'Africa' },
  { name: 'Montevideo', country: 'Uruguay', coordinates: [-56.21, -34.90], region: 'Americas' },
  { name: 'Montreal', country: 'Canada', coordinates: [-73.55, 45.50], region: 'Americas' },
  { name: 'Mumbai', country: 'India', coordinates: [72.84, 18.94], region: 'Asia' },
  { name: 'Muscat', country: 'Oman', coordinates: [58.54, 23.61], region: 'Middle East' },
  
  // N
  { name: 'Nagoya', country: 'Japan', coordinates: [136.88, 35.08], region: 'Asia' },
  { name: 'New Orleans', country: 'USA', coordinates: [-90.07, 29.95], region: 'Americas' },
  { name: 'New York', country: 'USA', coordinates: [-74.00, 40.71], region: 'Americas' },
  { name: 'Ningbo-Zhoushan', country: 'China', coordinates: [121.55, 29.87], region: 'Asia' },
  { name: 'Norfolk', country: 'USA', coordinates: [-76.29, 36.85], region: 'Americas' },
  { name: 'Novorossiysk', country: 'Russia', coordinates: [37.77, 44.72], region: 'Europe' },
  
  // O
  { name: 'Oakland', country: 'USA', coordinates: [-122.27, 37.80], region: 'Americas' },
  { name: 'Odesa', country: 'Ukraine', coordinates: [30.73, 46.48], region: 'Europe' },
  
  // P
  { name: 'Panama', country: 'Panama', coordinates: [-79.52, 9.00], region: 'Americas' },
  { name: 'Paranagua', country: 'Brazil', coordinates: [-48.51, -25.52], region: 'Americas' },
  { name: 'Piraeus', country: 'Greece', coordinates: [23.65, 37.94], region: 'Europe' },
  { name: 'Port Elizabeth', country: 'South Africa', coordinates: [25.60, -33.96], region: 'Africa' },
  { name: 'Port Hedland', country: 'Australia', coordinates: [118.60, -20.31], region: 'Oceania' },
  { name: 'Port Klang', country: 'Malaysia', coordinates: [101.39, 3.00], region: 'Asia' },
  { name: 'Port Louis', country: 'Mauritius', coordinates: [57.50, -20.16], region: 'Africa' },
  { name: 'Port Said', country: 'Egypt', coordinates: [32.31, 31.26], region: 'Mediterranean' },
  { name: 'Prince Rupert', country: 'Canada', coordinates: [-130.32, 54.32], region: 'Americas' },
  
  // Q
  { name: 'Qingdao', country: 'China', coordinates: [120.38, 36.07], region: 'Asia' },
  
  // R
  { name: 'Recife', country: 'Brazil', coordinates: [-34.87, -8.05], region: 'Americas' },
  { name: 'Riga', country: 'Latvia', coordinates: [24.10, 56.95], region: 'Europe' },
  { name: 'Rio Grande', country: 'Brazil', coordinates: [-52.10, -32.03], region: 'Americas' },
  { name: 'Rotterdam', country: 'Netherlands', coordinates: [4.47, 51.92], region: 'Europe' },
  
  // S
  { name: 'Salalah', country: 'Oman', coordinates: [54.09, 17.01], region: 'Middle East' },
  { name: 'San Antonio Chile', country: 'Chile', coordinates: [-71.62, -33.59], region: 'Americas' },
  { name: 'San Diego', country: 'USA', coordinates: [-117.16, 32.71], region: 'Americas' },
  { name: 'San Francisco', country: 'USA', coordinates: [-122.41, 37.77], region: 'Americas' },
  { name: 'San Juan', country: 'Puerto Rico', coordinates: [-66.11, 18.47], region: 'Americas' },
  { name: 'Santos', country: 'Brazil', coordinates: [-46.33, -23.96], region: 'Americas' },
  { name: 'Savannah', country: 'USA', coordinates: [-81.09, 32.08], region: 'Americas' },
  { name: 'Seattle', country: 'USA', coordinates: [-122.33, 47.60], region: 'Americas' },
  { name: 'Shanghai', country: 'China', coordinates: [121.47, 31.23], region: 'Asia' },
  { name: 'Shenzhen', country: 'China', coordinates: [114.05, 22.52], region: 'Asia' },
  { name: 'Singapore', country: 'Singapore', coordinates: [103.85, 1.29], region: 'Asia' },
  { name: 'Southampton', country: 'UK', coordinates: [-1.40, 50.89], region: 'Europe' },
  { name: 'St Petersburg', country: 'Russia', coordinates: [30.26, 59.93], region: 'Europe' },
  { name: 'Suez', country: 'Egypt', coordinates: [32.55, 29.96], region: 'Mediterranean' },
  { name: 'Surabaya', country: 'Indonesia', coordinates: [112.75, -7.25], region: 'Asia' },
  { name: 'Sydney', country: 'Australia', coordinates: [151.21, -33.86], region: 'Oceania' },
  
  // T
  { name: 'Tacoma', country: 'USA', coordinates: [-122.44, 47.25], region: 'Americas' },
  { name: 'Tallinn', country: 'Estonia', coordinates: [24.75, 59.44], region: 'Europe' },
  { name: 'Tangier', country: 'Morocco', coordinates: [-5.80, 35.78], region: 'Africa' },
  { name: 'Tangier Med', country: 'Morocco', coordinates: [-5.51, 35.89], region: 'Africa' },
  { name: 'Tanjung Pelepas', country: 'Malaysia', coordinates: [103.55, 1.36], region: 'Asia' },
  { name: 'Tauranga', country: 'New Zealand', coordinates: [176.17, -37.65], region: 'Oceania' },
  { name: 'Tema', country: 'Ghana', coordinates: [-0.02, 5.62], region: 'Africa' },
  { name: 'Tianjin', country: 'China', coordinates: [117.70, 38.98], region: 'Asia' },
  { name: 'Tokyo', country: 'Japan', coordinates: [139.75, 35.67], region: 'Asia' },
  
  // V
  { name: 'Valencia', country: 'Spain', coordinates: [-0.37, 39.46], region: 'Europe' },
  { name: 'Valparaiso', country: 'Chile', coordinates: [-71.61, -33.04], region: 'Americas' },
  { name: 'Vancouver', country: 'Canada', coordinates: [-123.12, 49.28], region: 'Americas' },
  { name: 'Vladivostok', country: 'Russia', coordinates: [131.91, 43.12], region: 'Asia' },
  
  // X
  { name: 'Xiamen', country: 'China', coordinates: [118.07, 24.48], region: 'Asia' },
  
  // Y
  { name: 'Yokohama', country: 'Japan', coordinates: [139.64, 35.44], region: 'Asia' },
  
  // Z
  { name: 'Zeebrugge', country: 'Belgium', coordinates: [3.18, 51.32], region: 'Europe' },
];

