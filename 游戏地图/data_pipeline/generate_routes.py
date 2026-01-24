import searoute as sr
import h3
import json
import os
import networkx as nx

# Configuration
OUTPUT_FILE = "frontend/public/data/route_cells.json"
PATHS_FILE = "frontend/public/data/paths.json"
RES = 3
K_RING = 1

# =============================================================================
# COMPREHENSIVE WORLD PORTS (Based on Lloyd's List Top 100 + Regional Hubs)
# =============================================================================
PORTS = {
    # === EAST ASIA ===
    "Shanghai": [31.23, 121.47],
    "Singapore": [1.29, 103.85],
    "Ningbo-Zhoushan": [29.87, 121.55],
    "Shenzhen": [22.52, 114.05],
    "Guangzhou": [23.10, 113.34],
    "Qingdao": [36.07, 120.38],
    "Busan": [35.10, 129.04],
    "Hong Kong": [22.31, 114.16],
    "Tianjin": [38.98, 117.70],
    "Kaohsiung": [22.62, 120.28],
    "Tokyo": [35.67, 139.75],
    "Yokohama": [35.44, 139.64],
    "Kobe": [34.69, 135.19],
    "Nagoya": [35.08, 136.88],
    "Dalian": [38.91, 121.60],
    "Xiamen": [24.48, 118.07],
    
    # === SOUTHEAST ASIA ===
    "Port Klang": [3.00, 101.39],
    "Tanjung Pelepas": [1.36, 103.55],
    "Laem Chabang": [13.08, 100.88],
    "Ho Chi Minh": [10.82, 106.62],
    "Hai Phong": [20.86, 106.68],
    "Manila": [14.59, 120.98],
    "Jakarta": [-6.11, 106.88],
    "Surabaya": [-7.25, 112.75],
    
    # === SOUTH ASIA ===
    "Mumbai": [18.94, 72.84],
    "Jawaharlal Nehru": [18.95, 72.95],
    "Chennai": [13.08, 80.29],
    "Colombo": [6.92, 79.86],
    "Chittagong": [22.33, 91.80],
    "Karachi": [24.85, 67.01],
    
    # === MIDDLE EAST ===
    "Dubai": [25.20, 55.27],
    "Jebel Ali": [25.01, 55.06],
    "Abu Dhabi": [24.52, 54.43],
    "Jeddah": [21.54, 39.17],
    "Salalah": [17.01, 54.09],
    "Muscat": [23.61, 58.54],
    "Kuwait": [29.34, 47.92],
    "Bandar Abbas": [27.19, 56.28],
    
    # === MEDITERRANEAN ===
    "Suez": [29.96, 32.55],
    "Port Said": [31.26, 32.31],
    "Alexandria": [31.20, 29.92],
    "Piraeus": [37.94, 23.65],
    "Gioia Tauro": [38.42, 15.90],
    "Valencia": [39.46, -0.37],
    "Barcelona": [41.35, 2.17],
    "Algeciras": [36.13, -5.45],
    "Tangier Med": [35.89, -5.51],
    "Genoa": [44.41, 8.93],
    "Marseille": [43.30, 5.37],
    "Malta": [35.90, 14.52],
    "Haifa": [32.82, 35.00],
    "Istanbul": [41.01, 28.98],
    "Mersin": [36.80, 34.63],
    
    # === NORTHERN EUROPE ===
    "Rotterdam": [51.92, 4.47],
    "Antwerp": [51.22, 4.40],
    "Hamburg": [53.55, 9.99],
    "Bremerhaven": [53.54, 8.58],
    "Le Havre": [49.49, 0.10],
    "Felixstowe": [51.96, 1.34],
    "Southampton": [50.89, -1.40],
    "London Gateway": [51.45, 0.45],
    "Gothenburg": [57.71, 11.97],
    "St Petersburg": [59.93, 30.26],
    "Gdansk": [54.35, 18.66],
    "Zeebrugge": [51.32, 3.18],
    "Dublin": [53.35, -6.23],
    
    # === NORTH AMERICA WEST ===
    "Los Angeles": [33.74, -118.27],
    "Long Beach": [33.75, -118.19],
    "Vancouver": [49.28, -123.12],
    "Seattle": [47.60, -122.33],
    "Oakland": [37.80, -122.27],
    "Prince Rupert": [54.32, -130.32],
    "Tacoma": [47.25, -122.44],
    "San Francisco": [37.77, -122.41],
    "San Diego": [32.71, -117.16],
    "Manzanillo MX": [19.05, -104.32],
    "Lazaro Cardenas": [17.96, -102.18],
    
    # === NORTH AMERICA EAST ===
    "New York": [40.71, -74.00],
    "Savannah": [32.08, -81.09],
    "Houston": [29.76, -95.36],
    "New Orleans": [29.95, -90.07],
    "Charleston": [32.78, -79.93],
    "Norfolk": [36.85, -76.29],
    "Baltimore": [39.29, -76.61],
    "Boston": [42.36, -71.06],
    "Miami": [25.76, -80.19],
    "Jacksonville": [30.33, -81.66],
    "Montreal": [45.50, -73.55],
    "Halifax": [44.64, -63.57],
    
    # === CARIBBEAN / CENTRAL AMERICA ===
    "Panama": [9.00, -79.52],
    "Colon": [9.35, -79.90],
    "Cartagena": [10.40, -75.51],
    "Kingston": [17.97, -76.79],
    "Freeport": [26.53, -78.70],
    "San Juan": [18.47, -66.11],
    
    # === SOUTH AMERICA ===
    "Santos": [-23.96, -46.33],
    "Buenos Aires": [-34.60, -58.38],
    "Callao": [-12.04, -77.14],
    "Valparaiso": [-33.04, -71.61],
    "Guayaquil": [-2.19, -79.88],
    "Itajai": [-26.91, -48.66],
    "Montevideo": [-34.90, -56.21],
    "Rio Grande": [-32.03, -52.10],
    "Paranagua": [-25.52, -48.51],
    "San Antonio Chile": [-33.59, -71.62],
    "Recife": [-8.05, -34.87],
    "Fortaleza": [-3.72, -38.52],
    "Manaus": [-3.10, -60.02],
    
    # === AFRICA ===
    "Durban": [-29.85, 31.02],
    "Cape Town": [-33.92, 18.42],
    "Port Elizabeth": [-33.96, 25.60],
    "Mombasa": [-4.04, 39.66],
    "Dar es Salaam": [-6.82, 39.29],
    "Lagos": [6.45, 3.39],
    "Tema": [5.62, -0.02],
    "Abidjan": [5.31, -4.01],
    "Dakar": [14.69, -17.44],
    "Casablanca": [33.59, -7.62],
    "Tangier": [35.78, -5.80],
    "Port Louis": [-20.16, 57.50],
    "Djibouti": [11.59, 43.15],
    
    # === OCEANIA ===
    "Sydney": [-33.86, 151.21],
    "Melbourne": [-37.81, 144.96],
    "Brisbane": [-27.47, 153.03],
    "Fremantle": [-32.06, 115.75],
    "Adelaide": [-34.85, 138.60],
    "Auckland": [-36.84, 174.76],
    "Tauranga": [-37.65, 176.17],
    "Port Hedland": [-20.31, 118.60],
    
    # === RUSSIA / BLACK SEA ===
    "Novorossiysk": [44.72, 37.77],
    "Vladivostok": [43.12, 131.91],
    "Constanta": [44.18, 28.66],
    "Odesa": [46.48, 30.73],
    
    # === SCANDINAVIA / BALTIC ===
    "Copenhagen": [55.68, 12.57],
    "Helsinki": [60.17, 24.94],
    "Riga": [56.95, 24.10],
    "Tallinn": [59.44, 24.75],
    
    # === KEY STRAITS / WAYPOINTS ===
    "Gibraltar": [36.14, -5.35],
    "Malacca": [2.19, 102.25],
    "Hormuz": [26.59, 56.25],
    "Bab el Mandeb": [12.58, 43.33],
    "Cape Horn": [-55.98, -67.27],
    "Cape of Good Hope": [-34.36, 18.47],
}

# =============================================================================
# SHIPPING LANE CONNECTIONS (Major Trade Routes)
# =============================================================================
EDGES = [
    # === TRANS-PACIFIC ===
    ("Shanghai", "Los Angeles"),
    ("Shanghai", "Long Beach"),
    ("Ningbo-Zhoushan", "Los Angeles"),
    ("Shenzhen", "Los Angeles"),
    ("Busan", "Seattle"),
    ("Busan", "Vancouver"),
    ("Tokyo", "Oakland"),
    ("Yokohama", "Los Angeles"),
    ("Kaohsiung", "Los Angeles"),
    ("Hong Kong", "Long Beach"),
    
    # === ASIA INTERNAL ===
    ("Shanghai", "Busan"),
    ("Shanghai", "Tokyo"),
    ("Shanghai", "Hong Kong"),
    ("Shanghai", "Singapore"),
    ("Shenzhen", "Hong Kong"),
    ("Shenzhen", "Singapore"),
    ("Hong Kong", "Singapore"),
    ("Hong Kong", "Manila"),
    ("Hong Kong", "Kaohsiung"),
    ("Busan", "Tokyo"),
    ("Busan", "Qingdao"),
    ("Singapore", "Port Klang"),
    ("Singapore", "Jakarta"),
    ("Singapore", "Ho Chi Minh"),
    ("Singapore", "Laem Chabang"),
    ("Singapore", "Manila"),
    ("Tokyo", "Yokohama"),
    ("Kobe", "Nagoya"),
    
    # === ASIA - EUROPE (Suez) ===
    ("Singapore", "Colombo"),
    ("Colombo", "Mumbai"),
    ("Mumbai", "Dubai"),
    ("Dubai", "Jeddah"),
    ("Jeddah", "Suez"),
    ("Suez", "Port Said"),
    ("Port Said", "Piraeus"),
    ("Piraeus", "Gioia Tauro"),
    ("Gioia Tauro", "Valencia"),
    ("Valencia", "Barcelona"),
    ("Valencia", "Algeciras"),
    ("Algeciras", "Tangier Med"),
    ("Tangier Med", "Rotterdam"),
    ("Rotterdam", "Hamburg"),
    ("Rotterdam", "Antwerp"),
    ("Hamburg", "Bremerhaven"),
    ("Antwerp", "Le Havre"),
    ("Le Havre", "Southampton"),
    ("Southampton", "Felixstowe"),
    
    # === ASIA - EUROPE (Cape) ===
    ("Singapore", "Durban"),
    ("Durban", "Cape Town"),
    ("Cape Town", "Rotterdam"),
    
    # === TRANS-ATLANTIC ===
    ("Rotterdam", "New York"),
    ("Hamburg", "New York"),
    ("Antwerp", "Savannah"),
    ("Le Havre", "Norfolk"),
    ("Southampton", "Halifax"),
    ("Felixstowe", "Montreal"),
    ("Rotterdam", "Halifax"),
    
    # === AMERICAS ===
    ("Los Angeles", "Seattle"),
    ("Los Angeles", "Oakland"),
    ("Seattle", "Vancouver"),
    ("Vancouver", "Prince Rupert"),
    ("New York", "Savannah"),
    ("New York", "Norfolk"),
    ("New York", "Charleston"),
    ("Savannah", "Charleston"),
    ("Savannah", "Jacksonville"),
    ("Jacksonville", "Miami"),
    ("Miami", "Kingston"),
    ("Miami", "San Juan"),
    ("Houston", "New Orleans"),
    ("Houston", "Panama"),
    ("Panama", "Colon"),
    ("Panama", "Cartagena"),
    ("Cartagena", "Kingston"),
    ("Kingston", "Freeport"),
    ("Los Angeles", "Manzanillo MX"),
    ("Manzanillo MX", "Panama"),
    ("Panama", "Callao"),
    ("Callao", "Valparaiso"),
    ("Valparaiso", "San Antonio Chile"),
    
    # === SOUTH AMERICA ===
    ("Santos", "Buenos Aires"),
    ("Buenos Aires", "Montevideo"),
    ("Santos", "Paranagua"),
    ("Paranagua", "Itajai"),
    ("Itajai", "Rio Grande"),
    ("Santos", "Recife"),
    ("Recife", "Fortaleza"),
    ("Recife", "Dakar"),
    ("Santos", "Cape Town"),
    
    # === AFRICA ===
    ("Durban", "Mombasa"),
    ("Mombasa", "Dar es Salaam"),
    ("Mombasa", "Djibouti"),
    ("Djibouti", "Jeddah"),
    ("Lagos", "Tema"),
    ("Tema", "Abidjan"),
    ("Abidjan", "Dakar"),
    ("Dakar", "Casablanca"),
    ("Casablanca", "Tangier"),
    ("Tangier", "Gibraltar"),
    ("Cape Town", "Port Elizabeth"),
    
    # === OCEANIA ===
    ("Singapore", "Fremantle"),
    ("Fremantle", "Adelaide"),
    ("Adelaide", "Melbourne"),
    ("Melbourne", "Sydney"),
    ("Sydney", "Brisbane"),
    ("Auckland", "Tauranga"),
    ("Sydney", "Auckland"),
    ("Melbourne", "Auckland"),
    
    # === MIDDLE EAST REGIONAL ===
    ("Dubai", "Jebel Ali"),
    ("Dubai", "Abu Dhabi"),
    ("Dubai", "Muscat"),
    ("Dubai", "Kuwait"),
    ("Muscat", "Karachi"),
    ("Karachi", "Mumbai"),
    ("Bandar Abbas", "Dubai"),
    
    # === MEDITERRANEAN INTERNAL ===
    ("Gibraltar", "Valencia"),
    ("Valencia", "Marseille"),
    ("Marseille", "Genoa"),
    ("Genoa", "Malta"),
    ("Malta", "Piraeus"),
    ("Piraeus", "Istanbul"),
    ("Istanbul", "Constanta"),
    ("Piraeus", "Haifa"),
    ("Haifa", "Port Said"),
    ("Mersin", "Piraeus"),
    
    # === NORTHERN EUROPE INTERNAL ===
    ("Rotterdam", "Gothenburg"),
    ("Gothenburg", "Copenhagen"),
    ("Copenhagen", "Gdansk"),
    ("Gdansk", "St Petersburg"),
    ("St Petersburg", "Helsinki"),
    ("Helsinki", "Tallinn"),
    ("Tallinn", "Riga"),
    ("Hamburg", "Gdansk"),
    ("Antwerp", "Zeebrugge"),
    ("Le Havre", "Dublin"),
    
    # === BLACK SEA ===
    ("Istanbul", "Novorossiysk"),
    ("Novorossiysk", "Constanta"),
    ("Constanta", "Odesa"),
    ("Istanbul", "Constanta"),
    ("Istanbul", "Odesa"),
    ("Odesa", "Novorossiysk"),
    
    # === BOHAI BAY / YELLOW SEA (China Northeast) ===
    ("Tianjin", "Dalian"),
    ("Dalian", "Qingdao"),
    ("Qingdao", "Shanghai"),
    ("Tianjin", "Qingdao"),
    ("Dalian", "Busan"),
    ("Qingdao", "Busan"),
    ("Shanghai", "Ningbo-Zhoushan"),
    ("Ningbo-Zhoushan", "Xiamen"),
    ("Xiamen", "Shenzhen"),
    ("Shenzhen", "Guangzhou"),
    ("Guangzhou", "Hong Kong"),
    
    # === INDONESIA ARCHIPELAGO ===
    ("Singapore", "Tanjung Pelepas"),
    ("Singapore", "Surabaya"),
    ("Jakarta", "Surabaya"),
    ("Surabaya", "Singapore"),
    ("Jakarta", "Port Klang"),
    ("Surabaya", "Fremantle"),
    
    # === FAR EAST RUSSIA ===
    ("Busan", "Vladivostok"),
    ("Vladivostok", "Dalian"),
    
    # === ENGLISH CHANNEL / DOVER STRAIT (Busiest Lane Globally - 500+ ships/day) ===
    ("Felixstowe", "Rotterdam"),
    ("Felixstowe", "Antwerp"),
    ("Felixstowe", "Zeebrugge"),
    ("Southampton", "Le Havre"),
    ("Southampton", "Rotterdam"),
    ("Southampton", "Antwerp"),
    ("London Gateway", "Rotterdam"),
    ("London Gateway", "Antwerp"),
    ("London Gateway", "Hamburg"),
    ("Dublin", "Felixstowe"),
    ("Dublin", "Liverpool" if "Liverpool" in PORTS else "Southampton"),
    
    # === CROSS-CHANNEL HIGH FREQUENCY ===
    ("Rotterdam", "Felixstowe"),
    ("Rotterdam", "Southampton"),
    ("Antwerp", "Southampton"),
    ("Antwerp", "Felixstowe"),
    ("Hamburg", "Felixstowe"),
    ("Bremerhaven", "Felixstowe"),
    ("Le Havre", "Southampton"),
    
    # === ADDITIONAL INTRA-ASIA HIGH TRAFFIC ===
    ("Shanghai", "Kaohsiung"),
    ("Shenzhen", "Kaohsiung"),
    ("Ningbo-Zhoushan", "Busan"),
    ("Guangzhou", "Singapore"),
    ("Xiamen", "Manila"),
    ("Hong Kong", "Ho Chi Minh"),
    ("Singapore", "Hai Phong"),
    ("Laem Chabang", "Ho Chi Minh"),
    
    # === RED SEA BYPASS (Cape Route - surged 50% in 2024) ===
    ("Mumbai", "Durban"),
    ("Colombo", "Durban"),
    ("Singapore", "Port Elizabeth"),
    ("Cape Town", "Santos"),
    ("Cape Town", "Buenos Aires"),
]

def generate_routes():
    print("Generating shipping routes...")
    
    route_cells = {}
    paths = {}
    
    for start, end in EDGES:
        if start not in PORTS or end not in PORTS:
            print(f"Skipping {start} -> {end}: port not found")
            continue
            
        print(f"Routing {start} -> {end}...")
        try:
            p1 = PORTS[start]
            p2 = PORTS[end]
            
            origin = [p1[1], p1[0]]
            dest = [p2[1], p2[0]]
            
            route_geojson = sr.searoute(origin, dest)
            coords = route_geojson['geometry']['coordinates']
            
            paths[f"{start}-{end}"] = coords
            
            path_h3 = set()
            
            for i in range(len(coords) - 1):
                c1 = coords[i]
                c2 = coords[i+1]
                
                p1_h3 = (c1[1], c1[0])
                p2_h3 = (c2[1], c2[0])
                
                try:
                    dist = h3.great_circle_distance(p1_h3, p2_h3, unit='km')
                    if dist > 0:
                        steps = int(dist / 30) + 1
                        for s in range(steps + 1):
                            f = s / steps
                            lat = p1_h3[0] + (p2_h3[0] - p1_h3[0]) * f
                            lon = p1_h3[1] + (p2_h3[1] - p1_h3[1]) * f
                            
                            cell = h3.latlng_to_cell(lat, lon, RES)
                            path_h3.add(cell)
                            
                except Exception as e:
                    print(f"Segment Error: {e}")

            final_path = set()
            for cell in path_h3:
                try:
                    neighbors = h3.grid_disk(cell, K_RING)
                    final_path.update(neighbors)
                except:
                    pass
            
            for cell in final_path:
                route_cells[cell] = {
                    "t": "r",
                    "r_id": f"{start}-{end}" 
                }
                
        except Exception as e:
            print(f"Failed {start}->{end}: {e}")

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(route_cells, f)
        
    print(f"Generated {len(route_cells)} route cells.")
    print(f"Saved to {OUTPUT_FILE}")

    with open(PATHS_FILE, 'w') as f:
        json.dump(paths, f)
    print(f"Saved {len(paths)} paths to {PATHS_FILE}")


if __name__ == "__main__":
    generate_routes()
