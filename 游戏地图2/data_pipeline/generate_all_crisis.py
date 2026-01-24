import h3
import json
import os

RES = 3

# Define all crisis scenarios
SCENARIOS = {
    "red_sea": {
        "name": "Red Sea Crisis",
        "year": "2023-2024",
        "zones": [
            {"name": "Bab el-Mandeb", "lat": 12.6, "lon": 43.3, "k": 3},
            {"name": "Southern Red Sea", "lat": 15.0, "lon": 42.0, "k": 4},
            {"name": "Gulf of Aden West", "lat": 12.0, "lon": 45.0, "k": 3},
            {"name": "Gulf of Aden Central", "lat": 12.5, "lon": 48.0, "k": 3},
            {"name": "Red Sea Central", "lat": 18.0, "lon": 40.0, "k": 3},
            {"name": "Red Sea North", "lat": 22.0, "lon": 38.0, "k": 2},
        ],
        "affected_routes": ["Suez", "Jeddah", "Salalah", "Djibouti", "Bab"]
    },
    "hormuz": {
        "name": "Hormuz Tension",
        "year": "2011-2012",
        "zones": [
            {"name": "Strait of Hormuz", "lat": 26.5, "lon": 56.3, "k": 3},
            {"name": "Persian Gulf Entry", "lat": 25.5, "lon": 55.0, "k": 3},
            {"name": "Gulf of Oman", "lat": 24.5, "lon": 58.5, "k": 3},
            {"name": "UAE Waters", "lat": 25.0, "lon": 54.0, "k": 2},
        ],
        "affected_routes": ["Hormuz", "Dubai", "Jebel Ali", "Abu Dhabi", "Muscat", "Bandar Abbas", "Kuwait"]
    },
    "black_sea": {
        "name": "Ukraine War",
        "year": "2022-now",
        "zones": [
            {"name": "Odesa", "lat": 46.5, "lon": 30.7, "k": 3},
            {"name": "Crimea", "lat": 45.0, "lon": 34.0, "k": 4},
            {"name": "Sea of Azov", "lat": 46.0, "lon": 37.0, "k": 3},
            {"name": "Western Black Sea", "lat": 44.0, "lon": 31.0, "k": 3},
            {"name": "Novorossiysk", "lat": 44.7, "lon": 37.8, "k": 2},
        ],
        "affected_routes": ["Odesa", "Novorossiysk", "Constanta", "Istanbul", "Black"]
    },
    "covid_ports": {
        "name": "COVID Congestion",
        "year": "2021",
        "zones": [
            {"name": "Los Angeles/Long Beach", "lat": 33.75, "lon": -118.2, "k": 3},
            {"name": "Shanghai", "lat": 31.2, "lon": 121.5, "k": 3},
            {"name": "Rotterdam", "lat": 51.9, "lon": 4.5, "k": 2},
            {"name": "Singapore", "lat": 1.3, "lon": 103.8, "k": 2},
            {"name": "Ningbo", "lat": 29.9, "lon": 121.5, "k": 2},
            {"name": "Shenzhen", "lat": 22.5, "lon": 114.0, "k": 2},
        ],
        "affected_routes": ["Los Angeles", "Long Beach", "Shanghai", "Rotterdam", "Singapore", "Ningbo", "Shenzhen"]
    },
    "ever_given": {
        "name": "Ever Given Suez",
        "year": "Mar-Jun 2021",
        "zones": [
            {"name": "Suez Canal North", "lat": 31.0, "lon": 32.3, "k": 2},
            {"name": "Suez Canal Central", "lat": 30.5, "lon": 32.4, "k": 2},
            {"name": "Suez Canal South", "lat": 30.0, "lon": 32.5, "k": 2},
            {"name": "Port Said", "lat": 31.3, "lon": 32.3, "k": 2},
        ],
        "affected_routes": ["Suez", "Port Said", "Alexandria"]
    },
    "taiwan_strait": {
        "name": "Taiwan Strait Crisis",
        "year": "Hypothetical",
        "zones": [
            {"name": "Taiwan Strait North", "lat": 25.5, "lon": 120.0, "k": 3},
            {"name": "Taiwan Strait Central", "lat": 24.0, "lon": 119.0, "k": 4},
            {"name": "Taiwan Strait South", "lat": 22.5, "lon": 118.5, "k": 3},
            {"name": "Kaohsiung Approaches", "lat": 22.0, "lon": 120.0, "k": 2},
            {"name": "Fujian Coast", "lat": 25.0, "lon": 118.5, "k": 2},
        ],
        "affected_routes": ["Kaohsiung", "Taiwan", "Xiamen", "Shenzhen", "Hong Kong", "Shanghai", "Busan", "Tokyo"]
    }
}

def generate_all_crisis_zones():
    print("Generating all crisis zone data...")
    
    all_data = {}
    
    for scenario_id, scenario in SCENARIOS.items():
        print(f"\n=== {scenario['name']} ({scenario['year']}) ===")
        cells = {}
        
        for zone in scenario["zones"]:
            lat, lon = zone["lat"], zone["lon"]
            k = zone["k"]
            
            center_cell = h3.latlng_to_cell(lat, lon, RES)
            disk = h3.grid_disk(center_cell, k)
            
            for cell in disk:
                cells[cell] = {"zone": zone["name"]}
            
            print(f"  {zone['name']}: {len(disk)} cells (k={k})")
        
        all_data[scenario_id] = {
            "name": scenario["name"],
            "year": scenario["year"],
            "cells": list(cells.keys()),
            "affected_routes": scenario["affected_routes"]
        }
        
        print(f"  Total: {len(cells)} cells")
    
    # Save to frontend data folder
    output_path = "frontend/public/data/all_crisis_zones.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(all_data, f)
    
    print(f"\nSaved all crisis data to {output_path}")

if __name__ == "__main__":
    generate_all_crisis_zones()
