import geopandas as gpd
import os

# Input/Output paths
SHP_FILE = "data_pipeline/data/raw/ne_50m_admin_0_countries.shp"
OUTPUT_DIR = "frontend/public/data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "countries.geojson")

os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Reading {SHP_FILE}...")
gdf = gpd.read_file(SHP_FILE)

# Ensure EPSG:4326
if gdf.crs != "EPSG:4326":
    gdf = gdf.to_crs("EPSG:4326")

# Simplify geometry slightly to reduce file size for web, but keep it decent for borders
print("Simplifying geometries...")
gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.01, preserve_topology=True)

print(f"Saving to {OUTPUT_FILE}...")
gdf.to_file(OUTPUT_FILE, driver='GeoJSON')

# Extract Labels
print("Extracting labels...")
# simple point for label
gdf['centroid'] = gdf.geometry.centroid
gdf['area'] = gdf.geometry.area # simple degree area, roughly proportional for sizing

labels = []
for idx, row in gdf.iterrows():
    name = row.get('NAME') or row.get('ADMIN')
    if name and row.centroid:
        # Scale factor calculation (heuristic)
        # Area in degrees^2.
        # Small countries ~0.1, Big ~100+
        # We want size roughly sqrt(area)
        size_factor = row.area ** 0.5
        
        labels.append({
            "name": name,
            "coordinates": [row.centroid.x, row.centroid.y],
            "size": size_factor
        })

import json
LABEL_FILE = os.path.join(OUTPUT_DIR, "country_labels.json")
with open(LABEL_FILE, 'w') as f:
    json.dump(labels, f)

print(f"Saved {len(labels)} labels to {LABEL_FILE}")
print("Done.")
