export interface GlobalPort {
  name: string;
  country: string;
  coordinates: [number, number];
  region: string;
}

export const MAJOR_PORTS: GlobalPort[] = [
  // --- East Asia ---
  { name: 'Shanghai', country: 'China', coordinates: [121.60, 31.23], region: 'Asia' }, // Yangshan/Waigaoqiao
  { name: 'Singapore', country: 'Singapore', coordinates: [103.82, 1.26], region: 'Asia' }, // Pasir Panjang
  { name: 'Ningbo', country: 'China', coordinates: [121.85, 29.86], region: 'Asia' }, // Zhoushan
  { name: 'Shenzhen', country: 'China', coordinates: [114.26, 22.56], region: 'Asia' }, // Yantian
  { name: 'Qingdao', country: 'China', coordinates: [120.32, 36.06], region: 'Asia' },
  { name: 'Guangzhou', country: 'China', coordinates: [113.60, 22.75], region: 'Asia' }, // Nansha
  { name: 'Busan', country: 'South Korea', coordinates: [129.07, 35.10], region: 'Asia' },
  { name: 'Tianjin', country: 'China', coordinates: [117.70, 38.99], region: 'Asia' },
  { name: 'Hong Kong', country: 'China', coordinates: [114.12, 22.35], region: 'Asia' },
  { name: 'Xiamen', country: 'China', coordinates: [118.06, 24.48], region: 'Asia' },
  { name: 'Kaohsiung', country: 'Taiwan', coordinates: [120.28, 22.62], region: 'Asia' },
  { name: 'Laem Chabang', country: 'Thailand', coordinates: [100.89, 13.08], region: 'Asia' },
  { name: 'Cai Mep', country: 'Vietnam', coordinates: [107.03, 10.52], region: 'Asia' }, // Vung Tau
  { name: 'Haiphong', country: 'Vietnam', coordinates: [106.70, 20.84], region: 'Asia' },
  { name: 'Tanjung Pelepas', country: 'Malaysia', coordinates: [103.55, 1.36], region: 'Asia' },
  { name: 'Port Klang', country: 'Malaysia', coordinates: [101.32, 2.99], region: 'Asia' },
  { name: 'Jakarta', country: 'Indonesia', coordinates: [106.87, -6.10], region: 'Asia' }, // Tanjung Priok
  { name: 'Manila', country: 'Philippines', coordinates: [120.96, 14.60], region: 'Asia' },
  { name: 'Tokyo', country: 'Japan', coordinates: [139.78, 35.62], region: 'Asia' },
  { name: 'Yokohama', country: 'Japan', coordinates: [139.66, 35.44], region: 'Asia' },

  // --- South Asia & Middle East ---
  { name: 'Jebel Ali', country: 'UAE', coordinates: [55.02, 25.01], region: 'Middle East' }, // Dubai
  { name: 'Colombo', country: 'Sri Lanka', coordinates: [79.84, 6.94], region: 'Asia' },
  { name: 'Mumbai', country: 'India', coordinates: [72.95, 18.95], region: 'Asia' }, // Nhava Sheva
  { name: 'Salalah', country: 'Oman', coordinates: [54.00, 16.94], region: 'Middle East' },
  { name: 'Jeddah', country: 'Saudi Arabia', coordinates: [39.16, 21.48], region: 'Middle East' },

  // --- Europe ---
  { name: 'Rotterdam', country: 'Netherlands', coordinates: [4.05, 51.95], region: 'Europe' }, // Maasvlakte
  { name: 'Antwerp', country: 'Belgium', coordinates: [4.28, 51.30], region: 'Europe' },
  { name: 'Hamburg', country: 'Germany', coordinates: [9.93, 53.53], region: 'Europe' },
  { name: 'Felixstowe', country: 'UK', coordinates: [1.31, 51.95], region: 'Europe' },
  { name: 'Le Havre', country: 'France', coordinates: [0.10, 49.48], region: 'Europe' },
  { name: 'Valencia', country: 'Spain', coordinates: [-0.32, 39.44], region: 'Europe' },
  { name: 'Algeciras', country: 'Spain', coordinates: [-5.43, 36.14], region: 'Europe' },
  { name: 'Barcelona', country: 'Spain', coordinates: [2.16, 41.34], region: 'Europe' },
  { name: 'Piraeus', country: 'Greece', coordinates: [23.61, 37.94], region: 'Europe' },
  { name: 'Genoa', country: 'Italy', coordinates: [8.88, 44.40], region: 'Europe' },

  // --- Africa ---
  { name: 'Tanger Med', country: 'Morocco', coordinates: [-5.50, 35.88], region: 'Africa' },
  { name: 'Cape Town', country: 'South Africa', coordinates: [18.43, -33.91], region: 'Africa' },
  { name: 'Durban', country: 'South Africa', coordinates: [31.04, -29.87], region: 'Africa' },
  { name: 'Port Said', country: 'Egypt', coordinates: [32.31, 31.27], region: 'Africa' },

  // --- Americas ---
  { name: 'Los Angeles', country: 'USA', coordinates: [-118.25, 33.73], region: 'Americas' },
  { name: 'Long Beach', country: 'USA', coordinates: [-118.21, 33.75], region: 'Americas' },
  { name: 'New York', country: 'USA', coordinates: [-74.05, 40.66], region: 'Americas' }, // NY/NJ
  { name: 'Savannah', country: 'USA', coordinates: [-81.08, 32.09], region: 'Americas' },
  { name: 'Vancouver', country: 'Canada', coordinates: [-123.11, 49.29], region: 'Americas' },
  { name: 'Manzanillo', country: 'Mexico', coordinates: [-104.31, 19.06], region: 'Americas' },
  { name: 'Santos', country: 'Brazil', coordinates: [-46.31, -23.97], region: 'Americas' },
  { name: 'Panama City', country: 'Panama', coordinates: [-79.56, 8.94], region: 'Americas' }, // Balboa
];
