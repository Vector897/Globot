import h3
import json

# Top 50 Global Ports by container throughput (TEUs)
TOP_PORTS = {
    "Shanghai": [31.23, 121.47],
    "Singapore": [1.29, 103.85],
    "Ningbo": [29.87, 121.55],
    "Shenzhen": [22.52, 114.05],
    "Guangzhou": [23.10, 113.34],
    "Qingdao": [36.07, 120.38],
    "Busan": [35.10, 129.04],
    "Hong Kong": [22.31, 114.16],
    "Tianjin": [38.98, 117.70],
    "Rotterdam": [51.92, 4.47],
    "Dubai": [25.27, 55.30],
    "Port Klang": [3.00, 101.39],
    "Antwerp": [51.22, 4.40],
    "Xiamen": [24.48, 118.07],
    "Kaohsiung": [22.62, 120.28],
    "Los Angeles": [33.74, -118.27],
    "Hamburg": [53.55, 9.99],
    "Tanjung Pelepas": [1.36, 103.55],
    "Long Beach": [33.75, -118.19],
    "Laem Chabang": [13.08, 100.88],
    "New York": [40.67, -74.04],
    "Ho Chi Minh": [10.82, 106.62],
    "Jakarta": [-6.11, 106.88],
    "Colombo": [6.92, 79.86],
    "Dalian": [38.91, 121.60],
    "Valencia": [39.46, -0.37],
    "Piraeus": [37.94, 23.65],
    "Savannah": [32.08, -81.09],
    "Algeciras": [36.13, -5.45],
    "Mumbai": [18.94, 72.84],
    "Felixstowe": [51.96, 1.34],
    "Santos": [-23.96, -46.33],
    "Colombo": [6.92, 79.86],
    "Manila": [14.59, 120.98],
    "Durban": [-29.85, 31.02],
    "Le Havre": [49.49, 0.10],
    "Jeddah": [21.54, 39.17],
    "Seattle": [47.60, -122.33],
    "Vancouver": [49.28, -123.12],
    "Melbourne": [-37.81, 144.96],
    "Sydney": [-33.86, 151.21],
    "Tokyo": [35.67, 139.75],
    "Yokohama": [35.44, 139.64],
    "Osaka": [34.65, 135.43],
    "Karachi": [24.85, 67.01],
    "Cape Town": [-33.92, 18.42],
    "Barcelona": [41.35, 2.17],
    "Houston": [29.76, -95.36],
    "Panama": [9.00, -79.52],
    "Mombasa": [-4.04, 39.66],
}

RES = 3

def generate_ports_cells():
    print("Generating top 50 ports cells...")
    
    all_cells = {}
    labels = []
    
    for name, coords in TOP_PORTS.items():
        lat, lon = coords[0], coords[1]
        
        # Get single center cell only
        center_cell = h3.latlng_to_cell(lat, lon, RES)
        
        all_cells[center_cell] = {
            "t": "p",  # Type: Port
            "name": name
        }
        
        # Also create label data
        labels.append({
            "name": name,
            "coordinates": [lon, lat]
        })
        
        print(f"  {name}: cell {center_cell}")
    
    # Save cells to frontend data folder
    output_path = "frontend/public/data/ports_cells.json"
    with open(output_path, 'w') as f:
        json.dump(all_cells, f)
    
    # Save labels
    labels_path = "frontend/public/data/port_labels.json"
    with open(labels_path, 'w') as f:
        json.dump(labels, f)
    
    print(f"Generated {len(all_cells)} port cells.")
    print(f"Saved to {output_path}")
    print(f"Saved labels to {labels_path}")

if __name__ == "__main__":
    generate_ports_cells()
