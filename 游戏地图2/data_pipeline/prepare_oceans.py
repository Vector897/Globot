import geopandas as gpd
import os
import zipfile

# Paths
ZIP_FILE = "data_pipeline/data/raw/ne_50m_geography_marine_polys.zip"
EXTRACT_DIR = "data_pipeline/data/raw/marine"
OUTPUT_FILE = "frontend/public/data/oceans.geojson"

os.makedirs(EXTRACT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

# Unzip
with zipfile.ZipFile(ZIP_FILE, 'r') as zip_ref:
    zip_ref.extractall(EXTRACT_DIR)

# Find shapefile
shp_path = os.path.join(EXTRACT_DIR, "ne_50m_geography_marine_polys.shp")

print(f"Reading {shp_path}...")
gdf = gpd.read_file(shp_path)

# Ensure EPSG:4326
if gdf.crs != "EPSG:4326":
    gdf = gdf.to_crs("EPSG:4326")

# Simplify
print("Simplifying...")
gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.05, preserve_topology=True)

# Save
print(f"Saving to {OUTPUT_FILE}...")
gdf.to_file(OUTPUT_FILE, driver='GeoJSON')
print("Done.")
