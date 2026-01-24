import h3
import json

# Top 10 Global Straits and Canals by shipping traffic
STRAITS_CANALS = {
    "Malacca Str.": {"lat": 2.5, "lon": 101.0},
    "Singapore Str.": {"lat": 1.2, "lon": 103.8},
    "Suez Canal": {"lat": 30.5, "lon": 32.3},
    "Panama Canal": {"lat": 9.1, "lon": -79.7},
    "Hormuz Str.": {"lat": 26.5, "lon": 56.3},
    "Gibraltar Str.": {"lat": 35.9, "lon": -5.6},
    "Bab el-Mandeb": {"lat": 12.6, "lon": 43.3},
    "Dover Str.": {"lat": 51.0, "lon": 1.5},
    "Bosphorus": {"lat": 41.1, "lon": 29.0},
    "Taiwan Str.": {"lat": 24.5, "lon": 119.5},
}

RES = 3

def generate_straits_cells():
    print("Generating straits and canals cells (single cell each)...")
    
    all_cells = {}
    labels = []
    
    for name, info in STRAITS_CANALS.items():
        lat, lon = info["lat"], info["lon"]
        
        # Get single center cell only
        center_cell = h3.latlng_to_cell(lat, lon, RES)
        
        all_cells[center_cell] = {
            "t": "s",  # Type: Strait/Canal
            "name": name
        }
        
        # Also create label data
        labels.append({
            "name": name,
            "coordinates": [lon, lat]
        })
        
        print(f"  {name}: cell {center_cell}")
    
    # Save cells to frontend data folder
    output_path = "frontend/public/data/straits_cells.json"
    with open(output_path, 'w') as f:
        json.dump(all_cells, f)
    
    # Save labels
    labels_path = "frontend/public/data/strait_labels.json"
    with open(labels_path, 'w') as f:
        json.dump(labels, f)
    
    print(f"Generated {len(all_cells)} strait/canal cells.")
    print(f"Saved to {output_path}")
    print(f"Saved labels to {labels_path}")

if __name__ == "__main__":
    generate_straits_cells()
