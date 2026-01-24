import h3
import json

# Red Sea Crisis Zone (Houthi attack-affected areas)
# Covers Bab el-Mandeb Strait, Southern Red Sea, and Gulf of Aden approaches
CRISIS_ZONES = [
    {"name": "Bab el-Mandeb", "lat": 12.6, "lon": 43.3, "radius_k": 3},
    {"name": "Southern Red Sea", "lat": 15.0, "lon": 42.0, "radius_k": 4},
    {"name": "Gulf of Aden West", "lat": 12.0, "lon": 45.0, "radius_k": 3},
    {"name": "Gulf of Aden Central", "lat": 12.5, "lon": 48.0, "radius_k": 3},
    {"name": "Red Sea Central", "lat": 18.0, "lon": 40.0, "radius_k": 3},
    {"name": "Red Sea North", "lat": 22.0, "lon": 38.0, "radius_k": 2},
]

RES = 3

def generate_crisis_zone():
    print("Generating Red Sea crisis zone cells...")
    
    all_cells = {}
    
    for zone in CRISIS_ZONES:
        lat, lon = zone["lat"], zone["lon"]
        k = zone["radius_k"]
        
        center_cell = h3.latlng_to_cell(lat, lon, RES)
        cells = h3.grid_disk(center_cell, k)
        
        for cell in cells:
            all_cells[cell] = {
                "t": "c",  # Type: Crisis
                "zone": zone["name"]
            }
        
        print(f"  {zone['name']}: {len(cells)} cells (k={k})")
    
    # Save to frontend data folder
    output_path = "frontend/public/data/crisis_zone.json"
    with open(output_path, 'w') as f:
        json.dump(all_cells, f)
    
    print(f"Generated {len(all_cells)} total crisis zone cells.")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    generate_crisis_zone()
